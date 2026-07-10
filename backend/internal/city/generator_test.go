package city

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestGenerateProducesCompleteTown(t *testing.T) {
	state := Generate("测试居民", 42)
	if len(state.Scenes) != 13 || len(state.Buildings) != 12 {
		t.Fatalf("expected town and twelve public buildings, got %d scenes and %d buildings", len(state.Scenes), len(state.Buildings))
	}
	if len(state.NPCs) < 26 {
		t.Fatalf("expected institutions and visible town residents, got %d NPCs", len(state.NPCs))
	}
	required := map[string]bool{"school": false, "hospital": false, "police": false, "community": false, "government": false}
	for _, building := range state.Buildings {
		if _, ok := required[building.ID]; ok {
			required[building.ID] = true
		}
	}
	for id, present := range required {
		if !present {
			t.Fatalf("missing required building %s", id)
		}
	}
	for _, npc := range state.NPCs {
		if npc.AgentID == "" {
			t.Fatalf("NPC %s has no reserved agent interface", npc.Name)
		}
	}
	townResidents := 0
	for _, npc := range state.NPCs {
		if npc.SceneID == "town" {
			townResidents++
		}
	}
	if townResidents < 10 {
		t.Fatalf("expected a populated outdoor town, got %d visible residents", townResidents)
	}
	if state.Project.Title == "" || state.Project.Premise == "" {
		t.Fatal("expected a hidden town plot")
	}
	town := state.Scene("town")
	if town == nil || town.Width != 36 || town.Height != 30 || len(town.Tiles) != town.Width*town.Height {
		t.Fatal("town tile map has invalid dimensions")
	}
	vehicleCount := 0
	for _, object := range state.Objects {
		if object.SceneID != "town" || object.Kind != "tricycle" {
			continue
		}
		vehicleCount++
		if object.ID != "delivery_tricycle" || object.Action != "" || object.Prompt != "" {
			t.Fatalf("expected a non-interactive delivery tricycle, got %#v", object)
		}
		for x := object.X; x < object.X+2; x++ {
			if x >= town.Width || object.Y >= town.Height {
				t.Fatalf("vehicle %s extends outside the map", object.Name)
			}
			tile := town.Tiles[object.Y*town.Width+x]
			if tile != "road" && tile != "parking" {
				t.Fatalf("vehicle %s is parked on %s at %d,%d", object.Name, tile, x, object.Y)
			}
		}
	}
	if vehicleCount != 1 {
		t.Fatalf("expected only the delivery tricycle, got %d vehicles", vehicleCount)
	}
	startY := state.Player.Y
	if !state.Move(0, -1) || state.Player.Y != startY-1 {
		t.Fatal("expected player to walk north from station road")
	}
	if state.Move(8, 0) {
		t.Fatal("expected multi-tile movement to be rejected")
	}
}

func TestOnlyStoryNPCsCanTalkAndCrowdWanders(t *testing.T) {
	state := Generate("测试居民", 42)
	initial := map[string]Position{}
	storyNPCs, crowd := 0, 0
	for _, npc := range state.NPCs {
		if npc.Wandering {
			crowd++
			initial[npc.ID] = Position{X: npc.X, Y: npc.Y}
			if npc.CanDialogue {
				t.Fatalf("ambient crowd member %s should not allow dialogue", npc.Name)
			}
		}
		if npc.CanDialogue {
			storyNPCs++
			if !npc.Stakeholder && npc.ID != state.Project.OpeningNPCID {
				t.Fatalf("non-story NPC %s unexpectedly allows dialogue", npc.Name)
			}
		}
	}
	if crowd < 10 || storyNPCs == 0 {
		t.Fatalf("unexpected NPC split: story=%d crowd=%d", storyNPCs, crowd)
	}
	if !state.MoveWanderingNPCs() {
		t.Fatal("expected ambient crowd to move")
	}
	town := state.Scene("town")
	moved := 0
	for _, npc := range state.NPCs {
		if !npc.Wandering {
			continue
		}
		if initial[npc.ID] != (Position{X: npc.X, Y: npc.Y}) {
			moved++
		}
		tile := town.Tiles[npc.Y*town.Width+npc.X]
		if tile != "road" && tile != "parking" && tile != "park" {
			t.Fatalf("wandering NPC %s moved onto %s", npc.Name, tile)
		}
	}
	if moved == 0 {
		t.Fatal("expected at least one crowd member to change position")
	}
	for _, npc := range state.NPCs {
		if npc.Wandering && npc.HasWanderTarget && abs(npc.WanderTarget.X-initial[npc.ID].X)+abs(npc.WanderTarget.Y-initial[npc.ID].Y) < 8 {
			t.Fatalf("crowd member %s chose a destination that was too close", npc.Name)
		}
	}
	maxDistance := 0
	for tick := 0; tick < 7; tick++ {
		state.MoveWanderingNPCs()
	}
	for _, npc := range state.NPCs {
		if !npc.Wandering {
			continue
		}
		distance := abs(npc.X-initial[npc.ID].X) + abs(npc.Y-initial[npc.ID].Y)
		if distance > maxDistance {
			maxDistance = distance
		}
	}
	if maxDistance < 4 {
		t.Fatalf("crowd should make sustained progress instead of circling, max distance was %d", maxDistance)
	}
}

func TestProjectResolvesThroughStakeholderSupport(t *testing.T) {
	state := Generate("测试居民", 42)
	marked := 0
	for i := range state.NPCs {
		if state.NPCs[i].Stakeholder && marked < 4 {
			state.NPCs[i].Support = true
			marked++
		}
	}
	state.EvaluateProject()
	if !state.Project.Resolved || state.Notice == nil {
		t.Fatal("expected project result after four stakeholders agree")
	}
}

func TestBottomBuildingExitReturnsToRoad(t *testing.T) {
	state := Generate("测试居民", 42)
	state.Player.SceneID, state.Player.X, state.Player.Y = "market", 5, 6
	if !state.Move(0, 1) {
		t.Fatal("expected player to leave market")
	}
	if state.Player.SceneID != "town" || state.Player.X != 20 || state.Player.Y != 16 {
		t.Fatalf("unexpected market exit: %s %d,%d", state.Player.SceneID, state.Player.X, state.Player.Y)
	}
}

func TestLifeInteractionsChangeState(t *testing.T) {
	state := Generate("测试居民", 42)
	state.Player.SceneID, state.Player.X, state.Player.Y = "restaurant", 6, 2
	coins, hunger, clock := state.Player.Coins, state.Player.Hunger, state.Time
	if !state.Interact("restaurant_stove") {
		t.Fatal("expected restaurant meal interaction")
	}
	if state.Player.Coins != coins-8 || state.Player.Hunger <= hunger || state.Time != clock {
		t.Fatal("meal did not update life state")
	}
	state.Player.SceneID, state.Player.X, state.Player.Y = "market", 3, 2
	coins, hunger = state.Player.Coins, state.Player.Hunger
	energy := state.Player.Energy
	if !state.Interact("market_crates") {
		t.Fatal("expected market work interaction")
	}
	if state.Player.Coins <= coins || state.Player.Energy >= energy || state.Player.Hunger >= hunger {
		t.Fatal("work should earn money and consume energy")
	}
	if state.Time != "08:40" {
		t.Fatalf("moving cargo should consume 30 minutes, got %s", state.Time)
	}
	if state.Interact("town_well") {
		t.Fatal("distant interaction should be rejected")
	}
}

func TestAIBlueprintNormalizationKeepsInstitutionsAndUniqueAgents(t *testing.T) {
	blueprint := Blueprint{
		Name:      "模型生成镇",
		Project:   BlueprintPlot{Kind: "test", Premise: "测试公共事件", OpeningNPC: "missing"},
		Buildings: []BlueprintBuilding{{ID: "school", Name: "模型学校", Kind: "school"}},
		NPCs: []BlueprintNPC{
			{ID: "same", Name: "甲", Role: "教师", BuildingID: "school"},
			{ID: "same", Name: "乙", Role: "医生", BuildingID: "hospital"},
		},
	}
	state := GenerateFromBlueprint("测试居民", blueprint, 9)
	if len(state.Buildings) != 12 || len(state.NPCs) < 16 {
		t.Fatalf("normalized AI town is incomplete: buildings=%d npcs=%d", len(state.Buildings), len(state.NPCs))
	}
	seen := map[string]bool{}
	for _, npc := range state.NPCs {
		if npc.AgentID == "" || seen[npc.AgentID] {
			t.Fatalf("invalid or duplicate agent id %q", npc.AgentID)
		}
		seen[npc.AgentID] = true
	}
	if state.Project.OpeningNPCID == "missing" || state.FindNPC(state.Project.OpeningNPCID) == nil {
		t.Fatal("opening NPC should be repaired to an existing resident")
	}
}

func TestProjectStageFollowsInvestigationAndNegotiation(t *testing.T) {
	state := Generate("测试居民", 42)
	stakeholders := make([]*NPC, 0, 4)
	for i := range state.NPCs {
		if state.NPCs[i].Stakeholder && len(stakeholders) < 4 {
			stakeholders = append(stakeholders, &state.NPCs[i])
		}
	}
	for i := 0; i < 3; i++ {
		state.Player.Knowledge[stakeholders[i].ID] = true
	}
	state.UpdateProjectStage()
	if state.Project.Stage != 1 {
		t.Fatalf("expected investigation stage 1, got %d", state.Project.Stage)
	}
	stakeholders[0].Support, stakeholders[1].Support = true, true
	state.UpdateProjectStage()
	if state.Project.Stage != 2 {
		t.Fatalf("expected negotiation stage 2, got %d", state.Project.Stage)
	}
	stakeholders[2].Support, stakeholders[3].Support = true, true
	state.UpdateProjectStage()
	if state.Project.Stage != 3 {
		t.Fatalf("expected implementation stage 3, got %d", state.Project.Stage)
	}
}

func TestStoryViewOnlyExposesDiscoveredPublicInformation(t *testing.T) {
	state := Generate("测试居民", 42)
	if state.Mode != "offline" || state.Story == nil {
		t.Fatal("offline town should expose a story sidebar view")
	}
	if len(state.Story.KnownPeople) != 0 {
		t.Fatal("residents should remain unknown before conversation")
	}
	npc := &state.NPCs[0]
	state.Player.Knowledge[npc.ID] = true
	state.RefreshStoryView()
	if len(state.Story.KnownPeople) != 1 || state.Story.KnownPeople[0].Name != npc.Name {
		t.Fatal("discovered resident was not added to story view")
	}
	data, err := json.Marshal(state)
	if err != nil {
		t.Fatal(err)
	}
	serialized := string(data)
	if strings.Contains(serialized, npc.Concern) || strings.Contains(serialized, "needles") || strings.Contains(serialized, "support") {
		t.Fatal("story view leaked hidden negotiation state")
	}

	aiState := GenerateFromBlueprint("测试居民", OfflineBlueprint(42), 42)
	aiState.Mode = "ai"
	aiState.RefreshStoryView()
	if aiState.Story == nil || aiState.Story.Title == "" {
		t.Fatal("AI mode should expose its generated main story")
	}
}

func TestNightSettlementWithoutRoomLeavesPlayerOnStreet(t *testing.T) {
	state := Generate("测试居民", 42)
	state.Time = "21:49"
	state.Player.Energy = 90
	if !state.TickMinute() {
		t.Fatal("expected 21:50 to settle the night")
	}
	if state.Day != 2 || state.Time != "07:00" {
		t.Fatalf("expected next morning, got day %d %s", state.Day, state.Time)
	}
	if state.Player.SceneID != "town" || state.Player.Energy != 22 || state.Notice == nil || !strings.Contains(state.Notice.Text, "流落街头") {
		t.Fatal("unbooked player should wake on the street with low energy")
	}
}

func TestHotelRoomPricesAndNightRecovery(t *testing.T) {
	tests := []struct {
		room   string
		price  int
		energy int
	}{
		{room: "five", price: 15, energy: 72},
		{room: "three", price: 28, energy: 84},
		{room: "single", price: 45, energy: 100},
	}
	for _, test := range tests {
		t.Run(test.room, func(t *testing.T) {
			state := Generate("测试居民", 42)
			state.Player.SceneID, state.Player.X, state.Player.Y = "hotel", 6, 2
			coins := state.Player.Coins
			if !state.BookRoom(test.room) {
				t.Fatal("expected room booking at hotel desk")
			}
			if state.Player.Lodging == nil || state.Player.Coins != coins-test.price {
				t.Fatalf("booking price mismatch: lodging=%+v coins=%d", state.Player.Lodging, state.Player.Coins)
			}
			state.Time = "21:49"
			if !state.TickMinute() {
				t.Fatal("expected booked night settlement")
			}
			if state.Player.SceneID != "hotel" || state.Player.Energy != test.energy || state.Player.Lodging != nil {
				t.Fatalf("unexpected room recovery: scene=%s energy=%d lodging=%+v", state.Player.SceneID, state.Player.Energy, state.Player.Lodging)
			}
		})
	}
}

func TestGameClockAdvancesOneMinutePerTick(t *testing.T) {
	state := Generate("测试居民", 42)
	state.Time = "08:10"
	if state.TickMinute() || state.Time != "08:11" {
		t.Fatalf("expected one in-game minute per tick, got %s", state.Time)
	}
}

func TestZeroHungerOrMoodEndsGame(t *testing.T) {
	for _, stat := range []string{"hunger", "mood"} {
		t.Run(stat, func(t *testing.T) {
			state := Generate("测试居民", 42)
			state.Player.SceneID, state.Player.X, state.Player.Y = "town", 16, 28
			if stat == "hunger" {
				state.Player.Hunger = 1
				state.Steps = 4
				if !state.Move(0, -1) {
					t.Fatal("expected final movement")
				}
			} else {
				state.Player.Mood = 1
				state.Player.Lodging = nil
				state.Time = "21:49"
				state.Player.Mood = 20
				state.TickMinute()
			}
			if !state.GameOver || state.GameOverReason == "" {
				t.Fatal("zero survival stat should end the game")
			}
		})
	}
}

func TestHotelReminderAndEarlyCheckIn(t *testing.T) {
	state := Generate("测试居民", 42)
	state.Time = "17:59"
	state.TickMinute()
	if state.Notice == nil || !strings.Contains(state.Notice.Text, "没有办理") {
		t.Fatal("expected lodging reminder at 18:00")
	}
	state.ClearNotice()
	state.Player.SceneID, state.Player.X, state.Player.Y = "hotel", 6, 2
	if !state.BookRoom("five") || !state.CheckIn() {
		t.Fatal("expected booked player to check in after 18:00")
	}
	if state.Day != 2 || state.Time != "07:00" || state.Player.Lodging != nil {
		t.Fatalf("unexpected early check-in result: day=%d time=%s lodging=%+v", state.Day, state.Time, state.Player.Lodging)
	}
}

func TestOrdinaryActionsDoNotAdvanceRealtimeClock(t *testing.T) {
	state := Generate("测试居民", 42)
	state.Time = "12:34"
	for i := 0; i < 5; i++ {
		if !state.Move(0, -1) {
			t.Fatal("expected movement on station road")
		}
	}
	if state.Time != "12:34" {
		t.Fatalf("movement must not advance realtime clock, got %s", state.Time)
	}
	state.Player.SceneID, state.Player.X, state.Player.Y = "restaurant", 6, 2
	if !state.Interact("restaurant_stove") {
		t.Fatal("expected meal interaction")
	}
	if state.Time != "12:34" {
		t.Fatalf("interaction must not advance realtime clock, got %s", state.Time)
	}
}
