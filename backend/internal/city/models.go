package city

type Position struct {
	X int `json:"x"`
	Y int `json:"y"`
}

type Scene struct {
	ID     string   `json:"id"`
	Name   string   `json:"name"`
	Width  int      `json:"width"`
	Height int      `json:"height"`
	Tiles  []string `json:"tiles"`
}

type Building struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Kind    string `json:"kind"`
	X       int    `json:"x"`
	Y       int    `json:"y"`
	Width   int    `json:"width"`
	Height  int    `json:"height"`
	DoorX   int    `json:"doorX"`
	DoorY   int    `json:"doorY"`
	SceneID string `json:"sceneId"`
	Summary string `json:"summary"`
}

type NPC struct {
	ID              string   `json:"id"`
	Name            string   `json:"name"`
	Role            string   `json:"role"`
	Personality     string   `json:"personality"`
	Mood            string   `json:"mood"`
	Activity        string   `json:"activity"`
	Opening         string   `json:"opening"`
	SceneID         string   `json:"sceneId"`
	X               int      `json:"x"`
	Y               int      `json:"y"`
	Color           string   `json:"color"`
	AgentID         string   `json:"agentId"`
	Biography       string   `json:"biography"`
	Concern         string   `json:"-"`
	Needles         []string `json:"-"`
	Support         bool     `json:"-"`
	Spoken          bool     `json:"-"`
	Stakeholder     bool     `json:"-"`
	CanDialogue     bool     `json:"canDialogue"`
	Wandering       bool     `json:"wandering"`
	WanderTarget    Position `json:"-"`
	HasWanderTarget bool     `json:"-"`
	WanderPause     int      `json:"-"`
	WanderTrips     int      `json:"-"`
}

type Player struct {
	Name          string          `json:"name"`
	SceneID       string          `json:"sceneId"`
	X             int             `json:"x"`
	Y             int             `json:"y"`
	Facing        string          `json:"facing"`
	Relationships map[string]int  `json:"relationships"`
	Knowledge     map[string]bool `json:"-"`
	Hunger        int             `json:"hunger"`
	Energy        int             `json:"energy"`
	Mood          int             `json:"mood"`
	Coins         int             `json:"coins"`
	Lodging       *Lodging        `json:"lodging,omitempty"`
}

type Lodging struct {
	RoomType string `json:"roomType"`
	Name     string `json:"name"`
	Price    int    `json:"price"`
}

type WorldObject struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Kind    string `json:"kind"`
	SceneID string `json:"sceneId"`
	X       int    `json:"x"`
	Y       int    `json:"y"`
	Action  string `json:"action"`
	Prompt  string `json:"prompt"`
}

type Notice struct {
	Text string `json:"text"`
}

type StoryView struct {
	Title       string            `json:"title"`
	Premise     string            `json:"premise"`
	Stage       string            `json:"stage"`
	KnownPeople []StoryPersonView `json:"knownPeople"`
}

type StoryPersonView struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Role     string `json:"role"`
	Building string `json:"building"`
}

type Project struct {
	Kind         string
	Title        string
	Premise      string
	SuccessText  string
	FailureText  string
	Resolved     bool
	Announcement string
	OpeningNPCID string
	Stage        int
	StageNames   []string
}

type State struct {
	Name                 string        `json:"name"`
	Theme                string        `json:"theme"`
	Time                 string        `json:"time"`
	Day                  int           `json:"day"`
	Weather              string        `json:"weather"`
	Season               string        `json:"season"`
	Scenes               []Scene       `json:"scenes"`
	Buildings            []Building    `json:"buildings"`
	Objects              []WorldObject `json:"objects"`
	NPCs                 []NPC         `json:"npcs"`
	Player               Player        `json:"player"`
	Notice               *Notice       `json:"notice,omitempty"`
	Ambient              string        `json:"ambient"`
	Mode                 string        `json:"mode"`
	Story                *StoryView    `json:"story,omitempty"`
	GameOver             bool          `json:"gameOver"`
	GameOverReason       string        `json:"gameOverReason,omitempty"`
	ProjectResolved      bool          `json:"projectResolved"`
	Project              Project       `json:"-"`
	Steps                int           `json:"-"`
	LodgingReminderShown bool          `json:"-"`
}

func (s *State) RefreshStoryView() {
	people := make([]StoryPersonView, 0)
	for _, npc := range s.NPCs {
		if !s.Player.Knowledge[npc.ID] {
			continue
		}
		people = append(people, StoryPersonView{ID: npc.ID, Name: npc.Name, Role: npc.Role, Building: s.Scene(npc.SceneID).Name})
	}
	s.Story = &StoryView{Title: s.Project.Title, Premise: s.Project.Premise, Stage: s.ProjectStageName(), KnownPeople: people}
}

func (s *State) Scene(id string) *Scene {
	for i := range s.Scenes {
		if s.Scenes[i].ID == id {
			return &s.Scenes[i]
		}
	}
	return nil
}

func (s *State) FindNPC(id string) *NPC {
	for i := range s.NPCs {
		if s.NPCs[i].ID == id {
			return &s.NPCs[i]
		}
	}
	return nil
}

func (s *State) PublicContext() string {
	return s.Name + "，" + s.Theme + "。现在是" + s.Season + s.Time + "，天气" + s.Weather + "。当前地点：" + s.Scene(s.Player.SceneID).Name + "。"
}

func (s *State) NearbyNPC(id string) *NPC {
	npc := s.FindNPC(id)
	if npc == nil || !npc.CanDialogue || npc.SceneID != s.Player.SceneID {
		return nil
	}
	if abs(npc.X-s.Player.X)+abs(npc.Y-s.Player.Y) > 2 {
		return nil
	}
	return npc
}

func (s *State) NearbyObject(id string) *WorldObject {
	for i := range s.Objects {
		object := &s.Objects[i]
		if object.ID == id && object.SceneID == s.Player.SceneID && abs(object.X-s.Player.X)+abs(object.Y-s.Player.Y) <= 2 {
			return object
		}
	}
	return nil
}

func (s *State) UpdateProjectStage() {
	known, supporters := 0, 0
	for _, npc := range s.NPCs {
		if !npc.Stakeholder {
			continue
		}
		if s.Player.Knowledge[npc.ID] {
			known++
		}
		if npc.Support {
			supporters++
		}
	}
	switch {
	case supporters >= 4:
		s.Project.Stage = 3
	case supporters >= 2:
		s.Project.Stage = 2
	case known >= 3:
		s.Project.Stage = 1
	default:
		s.Project.Stage = 0
	}
}

func (s *State) ProjectStageName() string {
	if s.Project.Stage >= 0 && s.Project.Stage < len(s.Project.StageNames) {
		return s.Project.StageNames[s.Project.Stage]
	}
	return "走访了解"
}

func abs(value int) int {
	if value < 0 {
		return -value
	}
	return value
}
