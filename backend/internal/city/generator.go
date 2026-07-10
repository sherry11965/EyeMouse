package city

import (
	"fmt"
	"math/rand"
	"strings"
)

const townWidth, townHeight = 36, 30

type Blueprint struct {
	Name      string              `json:"name"`
	Theme     string              `json:"theme"`
	Season    string              `json:"season"`
	Weather   string              `json:"weather"`
	Ambient   string              `json:"ambient"`
	Project   BlueprintPlot       `json:"project"`
	Buildings []BlueprintBuilding `json:"buildings"`
	NPCs      []BlueprintNPC      `json:"npcs"`
}

type BlueprintPlot struct {
	Kind        string `json:"kind"`
	Title       string `json:"title"`
	Premise     string `json:"premise"`
	SuccessText string `json:"successText"`
	OpeningNPC  string `json:"openingNpc"`
}

type BlueprintBuilding struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Kind    string `json:"kind"`
	Summary string `json:"summary"`
}

type BlueprintNPC struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Role        string   `json:"role"`
	Personality string   `json:"personality"`
	Biography   string   `json:"biography"`
	Mood        string   `json:"mood"`
	Activity    string   `json:"activity"`
	Opening     string   `json:"opening"`
	Concern     string   `json:"concern"`
	Keywords    []string `json:"keywords"`
	BuildingID  string   `json:"buildingId"`
	Stakeholder bool     `json:"stakeholder"`
}

var requiredBuildings = []BlueprintBuilding{
	{ID: "school", Name: "明德中学", Kind: "school", Summary: "镇上的九年制学校，有操场、食堂和旧教学楼。"},
	{ID: "hospital", Name: "安康医院", Kind: "hospital", Summary: "承担急诊、住院和周边村镇转诊。"},
	{ID: "police", Name: "长宁派出所", Kind: "police", Summary: "处理治安、户籍和邻里纠纷。"},
	{ID: "community", Name: "河畔家园小区", Kind: "community", Summary: "镇上的居民小区，楼下有活动室、快递架和一片公共空地。"},
	{ID: "government", Name: "镇政府便民中心", Kind: "hall", Summary: "镇政府与公共服务窗口所在地。"},
	{ID: "bank", Name: "长宁农商银行", Kind: "bank", Summary: "居民存取款、贷款和缴费的地方。"},
	{ID: "market", Name: "中心菜市场", Kind: "market", Summary: "早晨最热闹，摊贩和居民消息灵通。"},
	{ID: "restaurant", Name: "四季饭馆", Kind: "shop", Summary: "家常饭馆，也是镇民聚餐谈事的地方。"},
	{ID: "pharmacy", Name: "百姓药房", Kind: "pharmacy", Summary: "售卖常用药，也提供基础健康咨询。"},
	{ID: "post", Name: "长宁邮政所", Kind: "post", Summary: "兼营快递、报刊和便民缴费。"},
	{ID: "hotel", Name: "长宁招待所", Kind: "hotel", Summary: "班车站旁的小旅馆，外来人多在这里落脚。"},
	{ID: "station", Name: "长宁客运站", Kind: "station", Summary: "连接县城与周边村镇的公交站。"},
}

func OfflineBlueprint(seed int64) Blueprint {
	r := rand.New(rand.NewSource(seed))
	names := []string{"长宁镇", "清河镇", "望江镇"}
	plots := []BlueprintPlot{
		{Kind: "school_merger", Title: "保留明德中学高中部", Premise: "县里计划调整学校布局。家长希望保留高中部，医院担心青年家庭继续外流，镇政府则必须面对生源和经费现实。", SuccessText: "学校礼堂亮起了灯。家长、教师和镇干部围坐在一起，决定先用一年时间试行职教合作班，而不是立刻撤并。", OpeningNPC: "secretary"},
		{Kind: "night_market", Title: "旧车站夜市整治", Premise: "夜市带来生意，也带来噪声、消防和食品安全问题。公安、医院、摊贩、居民与法院调解员立场不同。", SuccessText: "旧车站广场重新划出了摊位和消防通道。招牌灯在十点半统一熄灭，第一晚没有人被赶走。", OpeningNPC: "officer"},
		{Kind: "hospital_road", Title: "打通医院急救通道", Premise: "医院后门的老街常被停车和摊位堵住。拓宽道路会影响市场商户，也会改变小区居民的停车和出行。", SuccessText: "救护车第一次顺利穿过后街。商户保住了摊位，小区也重新划出了停车和步行区域。", OpeningNPC: "doctor"},
	}
	plot := plots[r.Intn(len(plots))]
	npcs := offlineNPCs(plot.Kind)
	return Blueprint{Name: names[r.Intn(len(names))], Theme: "县城边缘的现代中国小镇", Season: "初秋", Weather: []string{"晴间多云", "小雨刚停", "北风微凉"}[r.Intn(3)], Ambient: "公交车刚驶离站台。学生骑车穿过十字路口，市场卷帘门一扇接一扇地升起来。", Project: plot, Buildings: append([]BlueprintBuilding(nil), requiredBuildings...), NPCs: npcs}
}

func offlineNPCs(plot string) []BlueprintNPC {
	npcs := []BlueprintNPC{
		{ID: "secretary", Name: "周敏", Role: "镇政府副镇长", Personality: "务实、谨慎、重视程序", Biography: "在长宁工作十二年，熟悉各部门但承受财政压力。", Mood: "一早就在开会", Activity: "核对民生项目材料", Opening: "你是新来的居民？镇上的事情不缺意见，缺的是肯把各方都听完的人。", Concern: "她需要一个合法、可负担且不会把矛盾推给下任的方案。", Keywords: []string{"预算", "试行", "各方", "公开", "合法"}, BuildingID: "government", Stakeholder: true},
		{ID: "teacher", Name: "杜文博", Role: "明德中学校长", Personality: "温和坚定，维护学生机会", Biography: "从乡村教师做到校长，女儿却在县城读书。", Mood: "忧心", Activity: "巡视早自习", Opening: "镇上的孩子不该因为住在哪里，就少一种选择。", Concern: "他想保住学校，但也知道生源下降，必须拿出新的课程与师资方案。", Keywords: []string{"学生", "课程", "职教", "师资", "试点"}, BuildingID: "school", Stakeholder: true},
		{ID: "doctor", Name: "林雪", Role: "安康医院急诊医生", Personality: "直接、专业、没有耐心听空话", Biography: "曾在市医院工作，三年前回镇照顾父母。", Mood: "值完夜班", Activity: "整理急诊交班记录", Opening: "有事直说。我十点前还要去查房。", Concern: "她在意急救效率、青年家庭流失和公共决策是否真正考虑生命安全。", Keywords: []string{"急救", "通道", "家庭", "安全", "时间"}, BuildingID: "hospital", Stakeholder: true},
		{ID: "officer", Name: "赵海峰", Role: "派出所社区民警", Personality: "耐心、有原则、熟悉每条街", Biography: "负责本镇社区警务，经常处理看似琐碎的长期矛盾。", Mood: "保持警觉", Activity: "查看昨夜巡逻记录", Opening: "镇子不大，可每件小事背后都站着几户人家。", Concern: "他反对一刀切，更在意消防、治安和能否形成居民共同遵守的规则。", Keywords: []string{"消防", "规则", "分区", "巡逻", "居民"}, BuildingID: "police", Stakeholder: true},
		{ID: "resident_director", Name: "许岚", Role: "小区业委会主任", Personality: "克制、严谨，善于协调", Biography: "住在河畔家园多年，长期协调停车、物业和邻里问题。", Mood: "认真", Activity: "核对居民意见登记表", Opening: "小区里的事不能只听声音最大的人，老人、孩子和租户都得算进去。", Concern: "她希望居民充分知情并参与协商，公共空间和出行安排要落实到具体方案。", Keywords: []string{"居民", "停车", "公共空间", "书面", "协商"}, BuildingID: "community", Stakeholder: true},
		{ID: "vendor", Name: "马桂芬", Role: "市场摊主", Personality: "精明直爽，重视实际生计", Biography: "在市场卖菜二十年，供两个孩子读完大学。", Mood: "忙碌", Activity: "给蔬菜喷水", Opening: "要问就边走边问，我这把青菜等不起。", Concern: "任何公共项目都不能让小商户突然失去收入、装卸位置或固定客源。", Keywords: []string{"生意", "摊位", "装卸", "补偿", "客流"}, BuildingID: "market", Stakeholder: true},
		{ID: "banker", Name: "沈立", Role: "农商银行客户经理", Personality: "谨慎、善算账", Biography: "主要负责小微商户和农户贷款。", Mood: "精神不错", Activity: "准备贷前调查", Opening: "想法要落地，最后总会走到现金流这一步。", Concern: "项目需要可验证的收入、成本和偿还安排。", Keywords: []string{"成本", "贷款", "现金流", "担保"}, BuildingID: "bank"},
		{ID: "pharmacist", Name: "叶青", Role: "药师", Personality: "细心、健谈", Biography: "经营药房，也照顾不少独居老人。", Mood: "平和", Activity: "核对慢病药品", Opening: "镇上的老人嘴上不说，身体的事都记在购药本里。", Concern: "公共变化不能切断老人看病、买药和出行。", Keywords: []string{"老人", "慢病", "出行", "药"}, BuildingID: "pharmacy"},
		{ID: "postman", Name: "唐明", Role: "邮递员", Personality: "乐观、消息灵通", Biography: "每天骑车跑遍镇上和附近六个村。", Mood: "风尘仆仆", Activity: "分拣快递", Opening: "我一天见的人，比广播站点的歌还多。", Concern: "道路调整和地址变化会直接影响末端配送。", Keywords: []string{"道路", "地址", "配送"}, BuildingID: "post"},
		{ID: "chef", Name: "罗师傅", Role: "饭馆老板", Personality: "豪爽、爱面子", Biography: "饭馆承接婚宴和学校聚餐，是本地餐饮协会联系人。", Mood: "正在备菜", Activity: "剁排骨", Opening: "坐，饭点还没到，茶管够。", Concern: "他关心客流、食品检查和同行是否公平承担成本。", Keywords: []string{"餐饮", "检查", "公平", "客流"}, BuildingID: "restaurant"},
		{ID: "student", Name: "陈果", Role: "高二学生", Personality: "聪明、坦率，有些焦虑", Biography: "成绩不错，希望留在镇上陪伴奶奶。", Mood: "赶时间", Activity: "整理错题本", Opening: "大人总说是为了我们，可开会的时候从来没有学生。", Concern: "她希望学生本人能参与影响学校和交通的决定。", Keywords: []string{"学生意见", "参与", "选择"}, BuildingID: "school"},
		{ID: "nurse", Name: "方媛", Role: "护士长", Personality: "干练、有同理心", Biography: "负责病区与护理排班，熟悉医院真实运转压力。", Mood: "略显疲惫", Activity: "安排本周值班", Opening: "医生说的是病情，我还得想谁来值夜班。", Concern: "她关心人手、夜班交通和患者家属的实际负担。", Keywords: []string{"人手", "夜班", "家属"}, BuildingID: "hospital"},
		{ID: "property_manager", Name: "顾诚", Role: "小区物业经理", Personality: "耐心、讲究实际", Biography: "负责河畔家园的维修、保洁和车辆登记。", Mood: "专注", Activity: "查看楼道报修单", Opening: "先说是哪栋哪户，能现场解决的就别拖到明天。", Concern: "公共安排需要明确维护责任、费用来源和居民通知方式。", Keywords: []string{"维修", "费用", "通知", "停车"}, BuildingID: "community"},
		{ID: "driver", Name: "韩东", Role: "公交司机", Personality: "寡言、守时", Biography: "每天往返县城六趟，知道各时段客流。", Mood: "准备发车", Activity: "检查轮胎", Opening: "还有十分钟发车，有话现在说。", Concern: "道路和站点方案必须考虑转弯、停靠与学生高峰。", Keywords: []string{"站点", "高峰", "转弯"}, BuildingID: "station"},
		{ID: "guest", Name: "秦若", Role: "外地记者", Personality: "好奇、敏锐", Biography: "来镇上采访基层公共服务。", Mood: "观察中", Activity: "在笔记本上画地图", Opening: "我刚来两天，已经听到同一件事的五种说法。", Concern: "她在意信息是否公开，以及外来叙事会不会简化本地矛盾。", Keywords: []string{"公开", "信息", "报道"}, BuildingID: "hotel"},
		{ID: "clerk", Name: "吴桐", Role: "户籍民警", Personality: "细致、温和", Biography: "负责户籍窗口和流动人口服务。", Mood: "耐心", Activity: "整理居民材料", Opening: "办事还是找人？先坐下慢慢说。", Concern: "她关心新居民、租户和流动摊贩是否被纳入协商。", Keywords: []string{"新居民", "租户", "登记"}, BuildingID: "police"},
	}
	if plot == "night_market" {
		npcs[3].Concern = "夜市必须保留生计，但消防通道、酒后纠纷和十点后的噪声都要有人负责。"
	}
	if plot == "hospital_road" {
		npcs[2].Concern = "救护车多次被堵，任何方案必须保证全天候急救通道，同时不能粗暴驱赶商户。"
	}
	return npcs
}

func Generate(playerName string, seed int64) *State {
	state := GenerateFromBlueprint(playerName, OfflineBlueprint(seed), seed)
	state.Mode = "offline"
	state.RefreshStoryView()
	return state
}

func GenerateFromBlueprint(playerName string, blueprint Blueprint, seed int64) *State {
	r := rand.New(rand.NewSource(seed))
	blueprint = normalizeBlueprint(blueprint, r)
	buildings := layoutBuildings(blueprint.Buildings)
	town := makeTownTiles(buildings, r)
	scenes := []Scene{{ID: "town", Name: blueprint.Name, Width: townWidth, Height: townHeight, Tiles: town}}
	for _, building := range buildings {
		scenes = append(scenes, makeInterior(building))
	}

	occupancy := map[string]int{}
	npcs := make([]NPC, 0, len(blueprint.NPCs))
	colors := []string{"#a34a3c", "#3f7584", "#7b6748", "#6e5580", "#4f7954", "#a16d3e", "#596b91"}
	for i, person := range blueprint.NPCs {
		buildingID := person.BuildingID
		if !buildingExists(buildings, buildingID) {
			buildingID = buildings[i%len(buildings)].ID
		}
		spot := occupancy[buildingID]
		occupancy[buildingID]++
		x, y := 4+spot%3, 3+(spot/3)%2
		id := safeID(person.ID, fmt.Sprintf("npc_%d", i))
		canDialogue := person.Stakeholder || id == blueprint.Project.OpeningNPC
		npcs = append(npcs, NPC{ID: id, AgentID: "agent:" + id, Name: person.Name, Role: person.Role, Personality: person.Personality, Biography: person.Biography, Mood: person.Mood, Activity: person.Activity, Opening: person.Opening, Concern: person.Concern, Needles: person.Keywords, SceneID: buildingID, X: x, Y: y, Color: colors[i%len(colors)], Stakeholder: person.Stakeholder, CanDialogue: canDialogue})
	}
	npcs = append(npcs, townResidents(len(npcs), colors)...)
	objects := lifeObjects(buildings)
	return &State{Name: blueprint.Name, Theme: blueprint.Theme, Time: "08:10", Day: 1, Weather: blueprint.Weather, Season: blueprint.Season, Scenes: scenes, Buildings: buildings, Objects: objects, NPCs: npcs, Player: Player{Name: playerName, SceneID: "town", X: 16, Y: 28, Facing: "up", Relationships: map[string]int{}, Knowledge: map[string]bool{}, Hunger: 78, Energy: 84, Mood: 65, Coins: 60}, Ambient: blueprint.Ambient, Project: Project{Kind: blueprint.Project.Kind, Title: blueprint.Project.Title, Premise: blueprint.Project.Premise, SuccessText: blueprint.Project.SuccessText, Announcement: blueprint.Project.SuccessText, OpeningNPCID: blueprint.Project.OpeningNPC, StageNames: []string{"听见风声", "厘清分歧", "协调方案", "落地协商"}}}
}

func townResidents(offset int, colors []string) []NPC {
	people := []struct {
		id, name, role, personality, biography, mood, activity, opening string
		x, y                                                            int
	}{
		{"park_child", "豆豆", "小学生", "活泼好奇", "放学后常来公园玩。", "开心", "追着皮球跑", "你也来玩吗？那边长椅后面是我们的秘密基地。", 20, 21},
		{"park_girl", "林小满", "初中生", "直率健谈", "家住河畔家园，熟悉附近每条小路。", "轻松", "陪弟弟玩滑梯", "大人总说公园吵，可小孩也得有地方待呀。", 22, 23},
		{"young_father", "蒋浩", "居民家长", "温和细心", "在县城上班，每天接送孩子。", "放松", "看孩子踢球", "这会儿人还不算多，傍晚公园里全是接孩子的家长。", 25, 21},
		{"grandma_liu", "刘奶奶", "退休居民", "热心爽朗", "在小区住了十多年，爱在公园散步。", "悠闲", "和邻居晒太阳", "新搬来的吧？想知道镇上哪儿买菜便宜，你问我就对了。", 28, 23},
		{"grandpa_he", "何大爷", "退休工人", "慢条斯理", "退休前是镇机械厂钳工。", "平静", "看人下棋", "坐会儿吧，镇上的消息急着听反而听不明白。", 30, 21},
		{"dog_walker", "苏晴", "小区居民", "开朗随和", "经营一家网店，白天常在小区附近活动。", "精神不错", "牵狗散步", "小区门口车越来越多，遛狗都得绕着走。", 19, 24},
		{"courier", "阿杰", "快递员", "利落健谈", "负责小区和周边商铺的快递配送。", "忙碌", "整理三轮车上的包裹", "先让一下，我把这几件送进小区就能歇口气。", 24, 15},
		{"shopper", "王芳", "普通居民", "务实亲切", "在医院做后勤，刚从市场买菜回来。", "赶着回家", "拎着菜和邻居说话", "今天市场的鱼新鲜，就是回小区这段路车有点多。", 15, 20},
		{"teen_boy", "赵一鸣", "高中生", "安静敏感", "住在小区三号楼，喜欢在公园画画。", "专注", "坐在树边画街景", "别挡光就行。其实这几棵树画出来还挺好看的。", 26, 24},
		{"aunt_chen", "陈阿姨", "社区志愿者", "热情细致", "经常组织小区清洁和儿童活动。", "热心", "登记周末活动人数", "周末要在公园办旧物交换，你要是有空也可以来搭把手。", 30, 24},
	}
	result := make([]NPC, 0, len(people))
	for i, person := range people {
		result = append(result, NPC{ID: person.id, AgentID: "agent:" + person.id, Name: person.name, Role: person.role, Personality: person.personality, Biography: person.biography, Mood: person.mood, Activity: person.activity, Opening: person.opening, Concern: "希望小区和公园安全、方便，也保留居民日常活动的空间。", Needles: []string{"居民", "安全", "公园", "出行"}, SceneID: "town", X: person.x, Y: person.y, Color: colors[(offset+i)%len(colors)], Wandering: true})
	}
	return result
}

func (s *State) MoveWanderingNPCs() bool {
	town := s.Scene("town")
	if town == nil || s.GameOver {
		return false
	}
	moved := false
	for i := range s.NPCs {
		npc := &s.NPCs[i]
		if !npc.Wandering || npc.SceneID != "town" {
			continue
		}
		if npc.WanderPause > 0 {
			npc.WanderPause--
			continue
		}
		if npc.HasWanderTarget && npc.X == npc.WanderTarget.X && npc.Y == npc.WanderTarget.Y {
			npc.WanderPause = 2 + (i+npc.WanderTrips)%4
			npc.HasWanderTarget = false
			continue
		}
		if !npc.HasWanderTarget {
			npc.WanderTrips++
			npc.WanderTarget = s.pickCrowdDestination(town, npc, i)
			npc.HasWanderTarget = true
		}
		next, ok := s.nextCrowdPathStep(town, npc)
		if !ok || !s.crowdWalkable(town, npc.ID, next.X, next.Y) {
			continue
		}
		npc.X, npc.Y = next.X, next.Y
		moved = true
	}
	return moved
}

func (s *State) pickCrowdDestination(town *Scene, npc *NPC, index int) Position {
	candidates := make([]Position, 0, town.Width*town.Height)
	for y := 0; y < town.Height; y++ {
		for x := 0; x < town.Width; x++ {
			tile := town.Tiles[y*town.Width+x]
			if tile == "road" || tile == "parking" || tile == "park" {
				if abs(x-npc.X)+abs(y-npc.Y) >= 8 && s.crowdWalkable(town, npc.ID, x, y) {
					candidates = append(candidates, Position{X: x, Y: y})
				}
			}
		}
	}
	if len(candidates) == 0 {
		return Position{X: npc.X, Y: npc.Y}
	}
	return candidates[(index*31+npc.WanderTrips*47+s.Day*7)%len(candidates)]
}

func (s *State) nextCrowdPathStep(town *Scene, npc *NPC) (Position, bool) {
	start := Position{X: npc.X, Y: npc.Y}
	target := npc.WanderTarget
	queue := []Position{start}
	seen := map[Position]bool{start: true}
	parent := map[Position]Position{}
	directions := []Position{{X: 1}, {Y: 1}, {X: -1}, {Y: -1}}
	for len(queue) > 0 {
		current := queue[0]
		queue = queue[1:]
		if current == target {
			break
		}
		for _, direction := range directions {
			next := Position{X: current.X + direction.X, Y: current.Y + direction.Y}
			if seen[next] || !s.crowdWalkable(town, npc.ID, next.X, next.Y) {
				continue
			}
			seen[next] = true
			parent[next] = current
			queue = append(queue, next)
		}
	}
	if !seen[target] {
		npc.HasWanderTarget = false
		return Position{}, false
	}
	step := target
	for parent[step] != start {
		step = parent[step]
	}
	return step, true
}

func crowdTile(town *Scene, x, y int) bool {
	if x < 0 || y < 0 || x >= town.Width || y >= town.Height {
		return false
	}
	tile := town.Tiles[y*town.Width+x]
	return tile == "road" || tile == "parking" || tile == "park"
}

func (s *State) crowdWalkable(town *Scene, npcID string, x, y int) bool {
	if !crowdTile(town, x, y) {
		return false
	}
	if s.Player.SceneID == "town" && s.Player.X == x && s.Player.Y == y {
		return false
	}
	for _, npc := range s.NPCs {
		if npc.ID != npcID && npc.SceneID == "town" && npc.X == x && npc.Y == y {
			return false
		}
	}
	for _, object := range s.Objects {
		width := 1
		if object.Kind == "car-red" || object.Kind == "car-white" || object.Kind == "tricycle" || object.Kind == "bus" {
			width = 2
		}
		if object.SceneID == "town" && object.Y == y && x >= object.X && x < object.X+width {
			return false
		}
	}
	return true
}

func normalizeBlueprint(b Blueprint, r *rand.Rand) Blueprint {
	if strings.TrimSpace(b.Name) == "" {
		b.Name = []string{"长宁镇", "清河镇", "望江镇"}[r.Intn(3)]
	}
	if b.Theme == "" {
		b.Theme = "县城边缘的现代中国小镇"
	}
	if b.Season == "" {
		b.Season = "初秋"
	}
	if b.Weather == "" {
		b.Weather = "晴间多云"
	}
	if b.Ambient == "" {
		b.Ambient = "公交车驶离站台，学校铃声和市场叫卖声同时响起。"
	}
	byID := map[string]BlueprintBuilding{}
	for _, building := range b.Buildings {
		byID[building.ID] = building
	}
	b.Buildings = nil
	for _, required := range requiredBuildings {
		if custom, ok := byID[required.ID]; ok {
			if custom.Kind == "" {
				custom.Kind = required.Kind
			}
			b.Buildings = append(b.Buildings, custom)
		} else {
			b.Buildings = append(b.Buildings, required)
		}
	}
	if len(b.NPCs) < 16 {
		b.NPCs = append(b.NPCs, offlineNPCs(b.Project.Kind)[len(b.NPCs):]...)
	}
	seenIDs := map[string]bool{}
	for i := range b.NPCs {
		id := safeID(b.NPCs[i].ID, fmt.Sprintf("npc_%d", i))
		if seenIDs[id] {
			id = fmt.Sprintf("%s_%d", id, i)
		}
		seenIDs[id] = true
		b.NPCs[i].ID = id
	}
	if !seenIDs[b.Project.OpeningNPC] {
		b.Project.OpeningNPC = b.NPCs[0].ID
	}
	return b
}

func layoutBuildings(defs []BlueprintBuilding) []Building {
	positions := [][3]int{{3, 1, 5}, {11, 1, 5}, {19, 1, 5}, {27, 1, 5}, {3, 11, 15}, {11, 11, 15}, {19, 11, 15}, {27, 11, 15}, {3, 25, 24}, {11, 25, 24}, {19, 25, 24}, {27, 25, 24}}
	result := make([]Building, 0, 12)
	for i := 0; i < 12 && i < len(defs); i++ {
		p := positions[i]
		result = append(result, Building{ID: defs[i].ID, SceneID: defs[i].ID, Name: defs[i].Name, Kind: defs[i].Kind, Summary: defs[i].Summary, X: p[0], Y: p[1], Width: 4, Height: 4, DoorX: p[0] + 1, DoorY: p[2]})
	}
	return result
}

func makeTownTiles(buildings []Building, r *rand.Rand) []string {
	tiles := make([]string, townWidth*townHeight)
	for y := 0; y < townHeight; y++ {
		for x := 0; x < townWidth; x++ {
			tile := "grass"
			if y >= 6 && y <= 9 || y >= 16 && y <= 19 || y >= 22 && y <= 23 || x >= 7 && x <= 9 || x >= 15 && x <= 17 || x >= 23 && x <= 25 || x >= 31 && x <= 33 {
				tile = "road"
			}
			if tile == "grass" && (x+y+r.Intn(7))%13 == 0 {
				tile = "flower"
			}
			if x >= 19 && x <= 30 && y >= 20 && y <= 24 {
				tile = "park"
			}
			tiles[y*townWidth+x] = tile
		}
	}
	for _, b := range buildings {
		for y := b.Y; y < b.Y+b.Height; y++ {
			for x := b.X; x < b.X+b.Width; x++ {
				tiles[y*townWidth+x] = "building:" + b.Kind
			}
		}
		tiles[b.DoorY*townWidth+b.DoorX] = "door:" + b.SceneID
	}
	for y := 20; y <= 21; y++ {
		for x := 34; x <= 35; x++ {
			tiles[y*townWidth+x] = "parking"
		}
	}
	for y := 20; y < 22; y++ {
		for x := 10; x < 14; x++ {
			tiles[y*townWidth+x] = "water"
		}
	}
	tiles[20*townWidth+20] = "tree"
	tiles[21*townWidth+27] = "tree"
	tiles[24*townWidth+29] = "tree"
	tiles[20*townWidth+18] = "well"
	return tiles
}

func makeInterior(building Building) Scene {
	const width, height = 10, 8
	tiles := make([]string, width*height)
	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			tile := "floor"
			if x == 0 || y == 0 || x == width-1 || y == height-1 {
				tile = "wall"
			}
			tiles[y*width+x] = tile
		}
	}
	tiles[7*width+5] = "exit"
	tiles[2*width+2] = "furniture"
	tiles[2*width+7] = "furniture"
	return Scene{ID: building.SceneID, Name: building.Name, Width: width, Height: height, Tiles: tiles}
}

func lifeObjects(buildings []Building) []WorldObject {
	objects := []WorldObject{
		{ID: "town_well", Name: "公共水井", Kind: "well", SceneID: "town", X: 22, Y: 17, Action: "drink", Prompt: "打水喝"},
		{ID: "park_bench", Name: "公园长椅", Kind: "bench", SceneID: "town", X: 25, Y: 13, Action: "rest", Prompt: "坐一会儿"},
		{ID: "park_slide", Name: "儿童滑梯", Kind: "playground", SceneID: "town", X: 23, Y: 14, Action: "look", Prompt: "看看孩子们玩耍"},
		{ID: "delivery_tricycle", Name: "快递三轮车", Kind: "tricycle", SceneID: "town", X: 20, Y: 8},
	}
	for _, b := range buildings {
		switch b.ID {
		case "restaurant":
			objects = append(objects, WorldObject{ID: "restaurant_stove", Name: "饭馆灶台", Kind: "stove", SceneID: b.ID, X: 7, Y: 2, Action: "eat", Prompt: "吃一份盖饭 · 8元"})
		case "hospital":
			objects = append(objects, WorldObject{ID: "hospital_bench", Name: "候诊长椅", Kind: "bench", SceneID: b.ID, X: 2, Y: 2, Action: "rest", Prompt: "坐下休息"})
		case "market":
			objects = append(objects, WorldObject{ID: "market_crates", Name: "待搬的货箱", Kind: "wood", SceneID: b.ID, X: 2, Y: 2, Action: "work", Prompt: "帮摊主搬货"})
		case "hotel":
			objects = append(objects, WorldObject{ID: "hotel_desk", Name: "招待所前台", Kind: "desk", SceneID: b.ID, X: 7, Y: 2, Action: "hotel", Prompt: "办理今晚入住"})
		case "government":
			objects = append(objects, WorldObject{ID: "government_radio", Name: "政务公开广播", Kind: "radio", SceneID: b.ID, X: 2, Y: 2, Action: "listen", Prompt: "听镇内广播"})
		}
	}
	return objects
}

func buildingExists(buildings []Building, id string) bool {
	for _, b := range buildings {
		if b.ID == id {
			return true
		}
	}
	return false
}
func safeID(value, fallback string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return fallback
	}
	return value
}

func (s *State) Move(dx, dy int) bool {
	if abs(dx)+abs(dy) != 1 {
		return false
	}
	scene := s.Scene(s.Player.SceneID)
	if scene == nil {
		return false
	}
	nx, ny := s.Player.X+dx, s.Player.Y+dy
	if nx < 0 || ny < 0 || nx >= scene.Width || ny >= scene.Height {
		return false
	}
	tile := scene.Tiles[ny*scene.Width+nx]
	if tile == "wall" || tile == "water" || tile == "tree" || tile == "well" || tile == "furniture" || strings.HasPrefix(tile, "building:") {
		return false
	}
	for _, npc := range s.NPCs {
		if npc.SceneID == s.Player.SceneID && npc.X == nx && npc.Y == ny {
			return false
		}
	}
	s.Player.X, s.Player.Y = nx, ny
	if dx < 0 {
		s.Player.Facing = "left"
	}
	if dx > 0 {
		s.Player.Facing = "right"
	}
	if dy < 0 {
		s.Player.Facing = "up"
	}
	if dy > 0 {
		s.Player.Facing = "down"
	}
	if strings.HasPrefix(tile, "door:") {
		s.enter(strings.TrimPrefix(tile, "door:"))
	}
	if tile == "exit" {
		s.leave()
	}
	s.Steps++
	if s.Steps%5 == 0 {
		s.Player.Hunger = clamp(s.Player.Hunger-2, 0, 100)
		s.Player.Energy = clamp(s.Player.Energy-1, 0, 100)
	}
	s.checkGameOver()
	return true
}
func (s *State) enter(sceneID string) {
	s.Player.SceneID, s.Player.X, s.Player.Y = sceneID, 5, 6
	s.Ambient = fmt.Sprintf("你推门走进%s。%s", s.Scene(sceneID).Name, s.buildingSummary(sceneID))
}
func (s *State) buildingSummary(id string) string {
	for _, b := range s.Buildings {
		if b.ID == id {
			return b.Summary
		}
	}
	return "屋里的人各自忙着手头的事。"
}
func (s *State) leave() {
	for _, b := range s.Buildings {
		if b.SceneID == s.Player.SceneID {
			exitY := b.DoorY + 1
			if b.DoorY < b.Y {
				exitY = b.DoorY - 1
			}
			s.Player.SceneID, s.Player.X, s.Player.Y = "town", b.DoorX, exitY
			s.Ambient = "你回到镇中心。车辆穿过十字路口，远处传来学校广播。"
			return
		}
	}
}
func (s *State) advance(minutes int) {
	if s.GameOver {
		return
	}
	for i := 0; i < minutes; i++ {
		var hour, minute int
		fmt.Sscanf(s.Time, "%d:%d", &hour, &minute)
		total := (hour*60 + minute + 1) % (24 * 60)
		s.Time = fmt.Sprintf("%02d:%02d", total/60, total%60)
		if s.Time == "18:00" && s.Player.Lodging == nil && !s.LodgingReminderShown {
			s.LodgingReminderShown = true
			s.Notice = &Notice{Text: "已经18:00了，你还没有办理今晚的住所。请在21:50前到招待所订房并入住，否则今晚只能露宿街头。"}
		}
		if s.Time == "21:50" {
			s.settleNight()
			return
		}
		if s.checkGameOver() {
			return
		}
	}
}

func (s *State) TickMinute() bool {
	day := s.Day
	s.advance(1)
	return s.Day != day
}

func (s *State) BookRoom(roomType string) bool {
	if s.GameOver {
		return false
	}
	if s.Player.SceneID != "hotel" || s.NearbyObject("hotel_desk") == nil {
		return false
	}
	if s.Player.Lodging != nil {
		s.Ambient = "前台翻了翻登记簿：你今晚已经订过房了。"
		return true
	}
	rooms := map[string]Lodging{
		"five":   {RoomType: "five", Name: "五人间", Price: 15},
		"three":  {RoomType: "three", Name: "三人间", Price: 28},
		"single": {RoomType: "single", Name: "单人间", Price: 45},
	}
	room, ok := rooms[roomType]
	if !ok {
		return false
	}
	if s.Player.Coins < room.Price {
		s.Ambient = fmt.Sprintf("前台说%s一晚%d元。你数了数零钱，还不够。", room.Name, room.Price)
		return true
	}
	s.Player.Coins -= room.Price
	s.Player.Lodging = &room
	if s.isAtOrAfter("18:00") {
		s.Ambient = fmt.Sprintf("你付了%d元，订下今晚的%s。现在已经可以在前台办理提前入住。", room.Price, room.Name)
	} else {
		s.Ambient = fmt.Sprintf("你付了%d元，订下今晚的%s。18:00后可以回前台提前入住。", room.Price, room.Name)
	}
	return true
}

func (s *State) CheckIn() bool {
	if s.GameOver || s.Player.SceneID != "hotel" || s.NearbyObject("hotel_desk") == nil {
		return false
	}
	if s.Player.Lodging == nil {
		s.Ambient = "前台没有查到你今晚的订房记录，请先办理住所。"
		return true
	}
	if !s.isAtOrAfter("18:00") {
		s.Ambient = "现在还不到18:00，前台请你晚些时候再来办理入住。"
		return true
	}
	s.settleNight()
	return true
}

func (s *State) settleNight() {
	s.Day++
	s.Time = "07:00"
	s.Player.Hunger = clamp(s.Player.Hunger-12, 0, 100)
	if s.Player.Lodging == nil {
		s.Player.SceneID, s.Player.X, s.Player.Y = "town", 17, 24
		s.Player.Energy = 22
		s.Player.Mood = clamp(s.Player.Mood-24, 0, 100)
		s.Notice = &Notice{Text: "21:50，镇上的灯陆续熄灭。你没有在招待所办理入住，只能在客运站屋檐下流落街头。天亮时腰背发酸，精神也很差。"}
		s.Ambient = "清晨的第一班车进站时，你从冰凉的长椅上醒来。"
		s.LodgingReminderShown = false
		s.checkGameOver()
		return
	}
	room := s.Player.Lodging
	s.Player.SceneID, s.Player.X, s.Player.Y = "hotel", 5, 6
	switch room.RoomType {
	case "five":
		s.Player.Energy = 72
		s.Player.Mood = clamp(s.Player.Mood+2, 0, 100)
	case "three":
		s.Player.Energy = 84
		s.Player.Mood = clamp(s.Player.Mood+5, 0, 100)
	case "single":
		s.Player.Energy = 100
		s.Player.Mood = clamp(s.Player.Mood+10, 0, 100)
	}
	s.Notice = &Notice{Text: fmt.Sprintf("你在%s住了一晚，第二天07:00精神恢复，房间也已自动退掉。", room.Name)}
	s.Ambient = "走廊里传来热水壶和开门声。新的一天开始了。"
	s.Player.Lodging = nil
	s.LodgingReminderShown = false
	s.checkGameOver()
}

func (s *State) EvaluateProject() {
	if s.Project.Resolved {
		return
	}
	s.UpdateProjectStage()
	s.RefreshStoryView()
	supporters, total := 0, 0
	for _, npc := range s.NPCs {
		if npc.Stakeholder {
			total++
			if npc.Support {
				supporters++
			}
		}
	}
	needed := 4
	if total < 4 {
		needed = total
	}
	if supporters >= needed {
		s.Project.Resolved = true
		s.Notice = &Notice{Text: s.Project.SuccessText}
		s.Ambient = s.Project.SuccessText
	}
}
func (s *State) ClearNotice() { s.Notice = nil }
func (s *State) Interact(objectID string) bool {
	if s.GameOver {
		return false
	}
	object := s.NearbyObject(objectID)
	if object == nil || object.Action == "" {
		return false
	}
	switch object.Action {
	case "drink":
		s.Player.Mood = clamp(s.Player.Mood+3, 0, 100)
		s.Ambient = "你喝了几口凉水，街上的声音也清晰了一些。"
	case "rest":
		s.Player.Energy = clamp(s.Player.Energy+18, 0, 100)
		s.Player.Hunger = clamp(s.Player.Hunger-3, 0, 100)
		s.Ambient = "你坐着看了一会儿镇上的人来人往。"
	case "eat":
		if s.Player.Coins < 8 {
			s.Ambient = "口袋里的零钱不够一份饭。"
			return true
		}
		s.Player.Coins -= 8
		s.Player.Hunger = clamp(s.Player.Hunger+42, 0, 100)
		s.Player.Mood = clamp(s.Player.Mood+6, 0, 100)
		s.Ambient = "热饭下肚，你听见邻桌还在谈镇上的事。"
	case "work":
		s.Player.Energy = clamp(s.Player.Energy-18, 0, 100)
		s.Player.Hunger = clamp(s.Player.Hunger-8, 0, 100)
		s.Player.Coins += 10
		day := s.Day
		s.advance(30)
		if s.Day == day {
			s.Ambient = "你花了30分钟搬完一批货，挣了10元工钱。"
		}
	case "nap":
		s.Player.Energy = clamp(s.Player.Energy+40, 0, 100)
		s.Player.Hunger = clamp(s.Player.Hunger-8, 0, 100)
		s.Ambient = "你睡了一个短觉，醒来时街上的光已经变了。"
	case "listen":
		s.Player.Mood = clamp(s.Player.Mood+4, 0, 100)
		s.Ambient = "广播里先是天气，随后播报了几条镇务消息。"
	case "look":
		s.Ambient = "你停下来观察了一会儿，周围都是居民生活留下的声音和痕迹。"
	case "hotel":
		return true
	default:
		return false
	}
	s.checkGameOver()
	return true
}

func (s *State) isAtOrAfter(clock string) bool {
	return s.Time >= clock && s.Time < "21:50"
}

func (s *State) checkGameOver() bool {
	if s.GameOver || (s.Player.Hunger > 0 && s.Player.Mood > 0) {
		return s.GameOver
	}
	s.GameOver = true
	if s.Player.Hunger <= 0 {
		s.GameOverReason = "饱腹值归零，你因饥饿倒下了。"
	} else {
		s.GameOverReason = "心情值归零，你失去了继续生活下去的意志。"
	}
	s.Notice = &Notice{Text: s.GameOverReason + " 游戏失败。"}
	return true
}
func clamp(value, low, high int) int {
	if value < low {
		return low
	}
	if value > high {
		return high
	}
	return value
}
