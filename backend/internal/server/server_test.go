package server

import (
	"encoding/json"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"atown/internal/city"
	"github.com/gorilla/websocket"
)

type received struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload"`
}

func TestOfflineTownWalkAndConversation(t *testing.T) {
	httpServer := httptest.NewServer(New())
	defer httpServer.Close()
	conn, _, err := websocket.DefaultDialer.Dial("ws"+strings.TrimPrefix(httpServer.URL, "http")+"/ws", nil)
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Close()
	_ = conn.SetReadDeadline(time.Now().Add(15 * time.Second))
	if err := conn.WriteJSON(map[string]any{"type": "enter", "mode": "offline", "profile": map[string]string{"name": "阿城"}}); err != nil {
		t.Fatal(err)
	}
	state := readNextState(t, conn)
	if state.Player.Name != "阿城" || len(state.NPCs) < 16 {
		t.Fatalf("unexpected initial state: player=%s npcs=%d", state.Player.Name, len(state.NPCs))
	}
	// Government is the first building on the middle block, with its entrance at 4,15.
	for i := 0; i < 80 && state.Player.SceneID == "town"; i++ {
		if err := conn.WriteJSON(map[string]any{"type": "move_to", "targetX": 4, "targetY": 15}); err != nil {
			t.Fatal(err)
		}
		state = readNextState(t, conn)
	}
	if state.Player.SceneID != "government" {
		t.Fatalf("expected government interior, got %s", state.Player.SceneID)
	}
	for i := 0; i < 12 && !(state.Player.X == 4 && state.Player.Y == 4); i++ {
		if err := conn.WriteJSON(map[string]any{"type": "move_to", "targetX": 4, "targetY": 4}); err != nil {
			t.Fatal(err)
		}
		state = readNextState(t, conn)
	}
	_ = talk(t, conn, "secretary", "周副镇长你好，我想了解镇上最近发生了什么。")
	_ = readNextState(t, conn)
	reply := talk(t, conn, "secretary", "你最担心什么，有什么现实难处？")
	if !strings.Contains(reply, "实话") {
		t.Fatalf("expected concern disclosure, got %s", reply)
	}
	_ = readNextState(t, conn)
	reply = talk(t, conn, "secretary", "我们可以公开预算，先试行一年，让各方依法参与协商。")
	if !strings.Contains(reply, "正式协商") {
		t.Fatalf("expected stakeholder response, got %s", reply)
	}
}

func readNextState(t *testing.T, conn *websocket.Conn) city.State {
	t.Helper()
	for {
		var response received
		if err := conn.ReadJSON(&response); err != nil {
			t.Fatal(err)
		}
		if response.Type != "city_state" {
			continue
		}
		var state city.State
		if err := json.Unmarshal(response.Payload, &state); err != nil {
			t.Fatal(err)
		}
		return state
	}
}
func talk(t *testing.T, conn *websocket.Conn, npcID, text string) string {
	t.Helper()
	if err := conn.WriteJSON(map[string]string{"type": "dialogue", "npcId": npcID, "text": text}); err != nil {
		t.Fatal(err)
	}
	for {
		var response received
		if err := conn.ReadJSON(&response); err != nil {
			t.Fatal(err)
		}
		if response.Type != "dialogue_reply" {
			continue
		}
		var payload struct {
			Text string `json:"text"`
		}
		if err := json.Unmarshal(response.Payload, &payload); err != nil {
			t.Fatal(err)
		}
		return payload.Text
	}
}
