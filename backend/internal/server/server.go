package server

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"
	"unicode/utf8"

	"atown/internal/ai"
	"atown/internal/city"
	"github.com/gorilla/websocket"
)

type incoming struct {
	Type     string    `json:"type"`
	NPCID    string    `json:"npcId"`
	Text     string    `json:"text"`
	DX       int       `json:"dx"`
	DY       int       `json:"dy"`
	TargetX  int       `json:"targetX"`
	TargetY  int       `json:"targetY"`
	ObjectID string    `json:"objectId"`
	RoomType string    `json:"roomType"`
	Mode     string    `json:"mode"`
	AI       ai.Config `json:"ai"`
	Profile  struct {
		Name string `json:"name"`
	} `json:"profile"`
}

type message struct {
	Type    string `json:"type"`
	Payload any    `json:"payload"`
}

type handler struct{ upgrader websocket.Upgrader }

func New() http.Handler {
	h := &handler{upgrader: websocket.Upgrader{CheckOrigin: func(*http.Request) bool { return true }}}
	mux := http.NewServeMux()
	mux.HandleFunc("/ws", h.websocket)
	mux.HandleFunc("/health", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})
	return cors(mux)
}

func cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		next.ServeHTTP(w, r)
	})
}

func (h *handler) websocket(w http.ResponseWriter, r *http.Request) {
	conn, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer conn.Close()
	sessionCtx, cancelSession := context.WithCancel(context.Background())
	defer cancelSession()

	var state *city.State
	var stateMu sync.Mutex
	var writeMu sync.Mutex
	var aiClient *ai.Client
	turns := make(map[string]int)
	histories := make(map[string][]ai.Message)
	send := func(out message) {
		writeMu.Lock()
		defer writeMu.Unlock()
		_ = conn.WriteJSON(out)
	}
	sendState := func() {
		writeMu.Lock()
		defer writeMu.Unlock()
		_ = conn.WriteJSON(message{Type: "city_state", Payload: state})
	}
	tickerStarted := false
	for {
		var request incoming
		if err := conn.ReadJSON(&request); err != nil {
			if !websocket.IsCloseError(err, websocket.CloseGoingAway, websocket.CloseNormalClosure, websocket.CloseNoStatusReceived) {
				log.Printf("websocket read: %v", err)
			}
			return
		}

		switch request.Type {
		case "enter":
			name := strings.TrimSpace(request.Profile.Name)
			if name == "" {
				name = "新邻居"
			}
			seed := time.Now().UnixNano()
			if request.Mode == "ai" {
				sendGenerationProgress(send, 1, 9, "正在连接创作模型。", "连接模型")
				client, clientErr := ai.New(request.AI)
				if clientErr != nil {
					send(message{Type: "generation_error", Payload: map[string]string{"message": clientErr.Error()}})
					continue
				}
				progressDone := make(chan struct{})
				go streamGenerationProgress(sessionCtx, progressDone, send)
				blueprint, generateErr := client.GenerateBlueprint(sessionCtx)
				close(progressDone)
				if generateErr != nil {
					send(message{Type: "generation_error", Payload: map[string]string{"message": generateErr.Error()}})
					continue
				}
				sendGenerationProgress(send, 7, 9, "正在布置小镇街区。", "构建世界")
				aiClient = client
				stateMu.Lock()
				state = city.GenerateFromBlueprint(name, blueprint, seed)
				state.Mode = "ai"
				state.RefreshStoryView()
				stateMu.Unlock()
				sendGenerationProgress(send, 8, 9, "正在让居民进入各自的生活。", "唤醒小镇")
				sendGenerationProgress(send, 9, 9, "小镇已经准备好。", "准备进入")
			} else {
				offlineSteps := []string{"正在选择本局公共事件。", "道路与公共机构正在落进地图。", "镇上的居民开始处理各自的日常。", "小镇已经准备好。"}
				for i, text := range offlineSteps {
					sendGenerationProgress(send, i+1, len(offlineSteps), text, "离线生成")
					time.Sleep(180 * time.Millisecond)
				}
				aiClient = nil
				stateMu.Lock()
				state = city.Generate(name, seed)
				stateMu.Unlock()
			}
			stateMu.Lock()
			sendState()
			stateMu.Unlock()
		if !tickerStarted {
			tickerStarted = true
			go func() {
				ticker := time.NewTicker(time.Second)
				defer ticker.Stop()
				for {
					select {
					case <-sessionCtx.Done():
						return
					case <-ticker.C:
						stateMu.Lock()
						if state == nil {
							stateMu.Unlock()
							continue
						}
						settled := state.TickMinute()
						crowdMoved := state.MoveWanderingNPCs()
						clock := map[string]any{"time": state.Time, "day": state.Day}
						// 只在有实质变化时推送完整状态，否则只推送时钟
						if settled || state.Notice != nil || state.GameOver {
							sendState()
							stateMu.Unlock()
							continue
						}
					stateMu.Unlock()
					// NPC移动单独推送轻量更新
					if crowdMoved {
						sendNPCPositions(send, state)
					}
					send(message{Type: "clock_tick", Payload: clock})
					}
				}
			}()
		}
		case "step":
			stateMu.Lock()
			if state != nil && !state.GameOver && state.Move(request.DX, request.DY) {
				sendState()
			}
			stateMu.Unlock()
		case "move_to":
			stateMu.Lock()
			if state == nil || state.GameOver {
				stateMu.Unlock()
				continue
			}
			dx, dy := nextStep(state, request.TargetX, request.TargetY)
			if (dx != 0 || dy != 0) && state.Move(dx, dy) {
				sendState()
			}
			stateMu.Unlock()
		case "dismiss_notice":
			stateMu.Lock()
			if state != nil {
				state.ClearNotice()
				sendState()
			}
			stateMu.Unlock()
		case "interact":
			stateMu.Lock()
			if state != nil {
				object := state.NearbyObject(request.ObjectID)
				if object != nil && object.Action == "hotel" {
					send(message{Type: "hotel_options", Payload: map[string]any{"rooms": []map[string]any{{"id": "five", "name": "五人间", "price": 15}, {"id": "three", "name": "三人间", "price": 28}, {"id": "single", "name": "单人间", "price": 45}}}})
				} else if state.Interact(request.ObjectID) {
					sendState()
				}
			}
			stateMu.Unlock()
		case "book_room":
			stateMu.Lock()
			if state != nil && state.BookRoom(request.RoomType) {
				sendState()
			}
			stateMu.Unlock()
		case "check_in":
			stateMu.Lock()
			if state != nil && state.CheckIn() {
				sendState()
			}
			stateMu.Unlock()
		case "skip_project":
			stateMu.Lock()
			if state != nil && !state.Project.Resolved {
				state.SkipProject()
				sendState()
			}
			stateMu.Unlock()
		case "dialogue":
			stateMu.Lock()
			if state == nil {
				stateMu.Unlock()
				continue
			}
			npc := state.NearbyNPC(request.NPCID)
			if npc == nil {
				stateMu.Unlock()
				continue
			}
			npcID := npc.ID
			npcCopy := *npc
			stateCopy := *state
			stateCopy.Player = state.Player
			stateMu.Unlock()
			send(message{Type: "dialogue_thinking", Payload: map[string]string{"npcId": npcID}})
			turns[npcID]++
			var reply string
			var delta int
			if aiClient != nil {
				var replyErr error
				reply, replyErr = aiClient.NPCReply(sessionCtx, &stateCopy, &npcCopy, histories[npcID], request.Text)
				if replyErr != nil {
					send(message{Type: "dialogue_error", Payload: map[string]string{"npcId": npcID, "message": replyErr.Error()}})
					continue
				} else {
					histories[npcID] = append(histories[npcID], ai.Message{Role: "user", Content: request.Text}, ai.Message{Role: "assistant", Content: reply})
				}
			}
			stateMu.Lock()
			npc = state.FindNPC(npcID)
			if npc == nil || state.NearbyNPC(npcID) == nil {
				sendState()
				stateMu.Unlock()
				continue
			}
			if aiClient != nil {
				delta = evaluateUnderstanding(state, npc, request.Text)
			} else {
				reply, delta = townDialogue(npc, request.Text, turns[npcID], state)
			}
			state.Player.Relationships[npc.ID] += delta
			state.UpdateProjectStage()
			state.RefreshStoryView()
			state.EvaluateProject()
			send(message{Type: "dialogue_reply", Payload: map[string]string{"npcId": npc.ID, "text": reply}})
			sendState()
			stateMu.Unlock()
		}
	}
}

func sendGenerationProgress(send func(message), step, total int, text, phase string) {
	send(message{Type: "generation_progress", Payload: map[string]any{"step": step, "total": total, "message": text, "phase": phase}})
}

// sendNPCPositions 发送轻量级的NPC位置更新
func sendNPCPositions(send func(message), state *city.State) {
	type npcPos struct {
		ID string `json:"id"`
		X  int    `json:"x"`
		Y  int    `json:"y"`
	}
	positions := make([]npcPos, 0, len(state.NPCs))
	for _, npc := range state.NPCs {
		if npc.Wandering {
			positions = append(positions, npcPos{ID: npc.ID, X: npc.X, Y: npc.Y})
		}
	}
	send(message{Type: "npc_positions", Payload: positions})
}

func streamGenerationProgress(ctx context.Context, done <-chan struct{}, send func(message)) {
	stages := []struct {
		phase string
		text  string
	}{
		{"生成主题", "正在生成小镇主题。"},
		{"生成主线", "正在生成本局主线。"},
		{"生成角色", "正在生成小镇角色。"},
		{"编织关系", "正在建立人物关系。"},
		{"完善世界", "正在完善小镇生活。"},
	}
	for index, stage := range stages {
		sendGenerationProgress(send, index+2, 9, stage.text, stage.phase)
		timer := time.NewTimer(2200 * time.Millisecond)
		select {
		case <-ctx.Done():
			timer.Stop()
			return
		case <-done:
			timer.Stop()
			return
		case <-timer.C:
		}
	}

	ticker := time.NewTicker(4 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-done:
			return
		case <-ticker.C:
			sendGenerationProgress(send, 6, 9, "正在完善小镇生活。", "完善世界")
		}
	}
}

func nextStep(state *city.State, targetX, targetY int) (int, int) {
	scene := state.Scene(state.Player.SceneID)
	if scene == nil || targetX < 0 || targetY < 0 || targetX >= scene.Width || targetY >= scene.Height {
		return 0, 0
	}
	type node struct{ x, y int }
	start := node{state.Player.X, state.Player.Y}
	target := node{targetX, targetY}
	queue := []node{start}
	seen := map[node]bool{start: true}
	parent := map[node]node{}
	dirs := []node{{0, -1}, {-1, 0}, {1, 0}, {0, 1}}
	for len(queue) > 0 {
		cur := queue[0]
		queue = queue[1:]
		if cur == target {
			break
		}
		for _, d := range dirs {
			next := node{cur.x + d.x, cur.y + d.y}
			if seen[next] || !walkable(state, scene, next.x, next.y, target.x, target.y) {
				continue
			}
			seen[next], parent[next] = true, cur
			queue = append(queue, next)
		}
	}
	if !seen[target] {
		return 0, 0
	}
	step := target
	for parent[step] != start {
		step = parent[step]
	}
	return step.x - start.x, step.y - start.y
}

func walkable(state *city.State, scene *city.Scene, x, y, targetX, targetY int) bool {
	if x < 0 || y < 0 || x >= scene.Width || y >= scene.Height {
		return false
	}
	tile := scene.Tiles[y*scene.Width+x]
	blocked := tile == "wall" || tile == "water" || tile == "tree" || tile == "well" || tile == "furniture" || strings.HasPrefix(tile, "building:")
	if strings.HasPrefix(tile, "door:") && (x != targetX || y != targetY) {
		blocked = true
	}
	if blocked {
		return false
	}
	for _, npc := range state.NPCs {
		if npc.SceneID == state.Player.SceneID && npc.X == x && npc.Y == y && (x != targetX || y != targetY) {
			return false
		}
	}
	return true
}

func townDialogue(npc *city.NPC, text string, turn int, state *city.State) (string, int) {
	clean := strings.ToLower(strings.TrimSpace(text))
	
	// 第一次交谈
	if !npc.Spoken {
		npc.Spoken = true
		state.Player.Knowledge[npc.ID] = true
		if npc.ID == state.Project.OpeningNPCID {
			return fmt.Sprintf("%s压低了声音：『%s。事情听着不大，可每个部门、每户人家都有自己的难处。你若真想了解，就别只听我一个人说。』", npc.Name, state.Project.Premise), 4
		}
		return npc.Opening + " 对方没有把话说透，像是在等你问到真正要紧的地方。", 3
	}

	// 询问顾虑
	if asksConcern(clean) {
		state.Player.Knowledge[npc.ID] = true
		return "对方沉默了一会儿，终于说了实话：『" + npc.Concern + "』", 6
	}

	// 提出解决方案
	matches := keywordMatches(clean, npc.Needles)
	relationship := state.Player.Relationships[npc.ID]
	if matches >= 1 && state.Player.Knowledge[npc.ID] {
		// 检查是否真的提出了具体方案
		hasSpecificPlan := containsSpecificPlan(clean)
		// 或者关系值足够高
		relationshipReady := relationship >= 10
		
		if hasSpecificPlan || relationshipReady {
			if !npc.Support {
				npc.Support = true
				npc.Mood = "愿意再谈谈"
				npc.Activity = "把自己的想法写在一张纸上"
				return "对方把你的话重复了一遍，确认你不是随口敷衍。『你要真能把这一点算进去，我愿意参加正式协商，自己把条件说清楚。』", 12
			}
			return "『我答应的事不会反悔。』对方说，『但别忘了，别人也有他们过不去的坎。』", 3
		}
		// 有关键词但没有具体方案
		return "『你说的这点我听到了。』对方点点头，『但具体怎么安排，你有没有想过？』", 2
	}

	// 询问其他人
	if strings.Contains(clean, "谁") || strings.Contains(clean, "别人") || strings.Contains(clean, "找谁") {
		return crossHint(npc.ID, state.Project.Kind), 3
	}
	
	// 直接询问支持
	if strings.Contains(clean, "支持") || strings.Contains(clean, "同意") || strings.Contains(clean, "答应") {
		return "『不是一句支持不支持。』对方皱了皱眉，『你先说说，我最担心的那件事准备怎么办？』", 1
	}
	
	// 建立关系
	if containsRelationshipBuilding(clean) {
		return "『你能这么说，我听着舒服。』对方态度缓和了一些，『但这件事还得看具体怎么做。』", 2
	}
	
	// 短回复
	if utf8.RuneCountInString(clean) < 4 {
		return "对方等了一会儿：『你可以直说。我更想知道，你有没有听懂我刚才在担心什么。』", 1
	}
	
	// 默认回复
	responses := []string{
		"『道理我都懂。』对方手里的动作没有停，『可日子不是按大道理过的。你再想想，这件事会具体影响到谁。』",
		"对方看了你一眼：『你愿意听是好事。但听见和听懂，中间还隔着一步。』",
		"『别急着劝我。』对方说，『先把我的顾虑原样说给我听，别换成你觉得更好听的话。』",
	}
	return responses[(turn-1)%len(responses)], 1
}

func asksConcern(text string) bool {
	for _, word := range []string{"担心", "顾虑", "为什么", "难处", "在意", "怕什么", "怎么了"} {
		if strings.Contains(text, word) {
			return true
		}
	}
	return false
}

func keywordMatches(text string, words []string) int {
	count := 0
	for _, word := range words {
		if strings.Contains(text, word) {
			count++
		}
	}
	return count
}

func evaluateUnderstanding(state *city.State, npc *city.NPC, text string) int {
	clean := strings.ToLower(text)
	
	// 第一阶段：询问顾虑
	if asksConcern(clean) {
		npc.Spoken = true
		state.Player.Knowledge[npc.ID] = true
		return 4
	}
	
	// 第二阶段：提出解决方案
	matches := keywordMatches(clean, npc.Needles)
	relationship := state.Player.Relationships[npc.ID]
	
	// 已经问过顾虑，且匹配关键词
	if matches > 0 && state.Player.Knowledge[npc.ID] {
		// 检查是否真的提出了具体方案
		hasSpecificPlan := containsSpecificPlan(clean)
		// 或者关系值足够高（说明之前交流充分）
		relationshipReady := relationship >= 10
		
		if hasSpecificPlan || relationshipReady {
			npc.Support = true
			npc.Mood = "愿意继续协商"
			return 6 + matches*2
		}
		// 有关键词但没有具体方案，给部分关系值
		return 3 + matches
	}
	
	// 第三阶段：建立关系
	if containsRelationshipBuilding(clean) {
		return 2
	}
	
	return 1
}

// containsSpecificPlan 检查是否包含具体方案
func containsSpecificPlan(text string) bool {
	specificWords := []string{
		// 方案类
		"安排", "计划", "方案", "步骤", "流程", "制度", "规则", "协议", "合同",
		// 资源类
		"预算", "资金", "人员", "设备", "材料", "费用", "钱", "拨款",
		// 时间地点类
		"时间", "地点", "负责人", "责任人", "监督",
		// 行动类
		"先做", "第一步", "首先", "然后", "接下来", "最后", "可以", "愿意", "答应", "保证", "承诺",
		// 解决类
		"解决", "处理", "改善", "调整", "修改", "优化", "协调", "沟通",
		// 具体措施
		"开会", "协商", "讨论", "调研", "考察", "试行", "试点", "分阶段",
	}
	for _, word := range specificWords {
		if strings.Contains(text, word) {
			return true
		}
	}
	return false
}

// containsRelationshipBuilding 检查是否包含建立关系的内容
func containsRelationshipBuilding(text string) bool {
	relationshipWords := []string{"理解", "明白", "知道", "感谢", "谢谢", "辛苦", "帮忙", "支持", "合作", "一起"}
	for _, word := range relationshipWords {
		if strings.Contains(text, word) {
			return true
		}
	}
	return false
}

func crossHint(id, project string) string {
	hints := map[string]string{
		"zhou": "『先去各家坐坐。桂芬说话冲，可她最清楚街上的实际日子；何师傅不点头，涉及木头和安全的事谁说都没用。』",
		"ma":   "『何师傅不爱说空话，你问清楚东西和人手。孙老师那边也别硬劝，她替巷里老人说话。』",
		"he":   "『去听听孙老师怎么说。再找小满，她手快，但做事前得有人提醒她慢半步。』",
		"sun":  "『桂芬最清楚每天几点进货。小满有新点子，你若能让她先问过别人，年轻人也能把事办好。』",
		"xia":  "『周主任知道规矩，何师傅知道什么能落地。你别只听我这个年轻人的。』",
	}
	if hint := hints[id]; hint != "" {
		return hint
	}
	return "『在镇上，一件事不能只问一个人。沿街再走走吧。』"
}
