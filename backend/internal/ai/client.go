package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"atown/internal/city"
)

type Config struct {
	BaseURL           string `json:"baseUrl"`
	APIKey            string `json:"apiKey"`
	Model             string `json:"model"`
	GenerationTimeout int    `json:"generationTimeout"`
	DialogueTimeout   int    `json:"dialogueTimeout"`
}

type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type Client struct {
	config Config
	http   *http.Client
}

var sharedTransport = func() *http.Transport {
	transport := http.DefaultTransport.(*http.Transport).Clone()
	transport.MaxIdleConns = 100
	transport.MaxIdleConnsPerHost = 20
	transport.TLSHandshakeTimeout = 10 * time.Second
	transport.IdleConnTimeout = 90 * time.Second
	return transport
}()

func New(config Config) (*Client, error) {
	config.BaseURL = strings.TrimRight(strings.TrimSpace(config.BaseURL), "/")
	config.Model = strings.TrimSpace(config.Model)
	if config.BaseURL == "" {
		config.BaseURL = "https://api.openai.com/v1"
	}
	if config.APIKey == "" {
		return nil, errors.New("AI 模式需要 API Key")
	}
	if config.Model == "" {
		return nil, errors.New("AI 模式需要模型名称")
	}
	config.GenerationTimeout = boundedTimeout(config.GenerationTimeout, 300, 60, 900)
	config.DialogueTimeout = boundedTimeout(config.DialogueTimeout, 120, 30, 300)
	return &Client{config: config, http: &http.Client{Transport: sharedTransport}}, nil
}

func (c *Client) GenerateBlueprint(ctx context.Context) (city.Blueprint, error) {
	prompt := fmt.Sprintf(`为一款中国现代小镇生活模拟游戏生成一局全新的结构化蓝图。本局唯一随机标识为 %d，必须据此生成与此前不同的镇名、事件关系和人物组合。小镇必须真实、日常、有学校、医院、派出所、居民小区、镇政府、银行、市场、饭馆、药房、邮政、招待所、客运站。生成20到24位NPC，分布在不同建筑和生活场景中；每人都有独立身份、性格、背景、当前活动、初次对话、私下顾虑和3到5个可被玩家方案命中的关键词。设计一条需要跨部门和居民协商的现实剧情，至少8位NPC是stakeholder，并让角色之间存在符合身份与生活经历的立场联系。不要奇幻、犯罪阴谋或超自然内容。openingNpc填写最适合率先透露事件的NPC id。建筑id必须只使用：school,hospital,police,community,government,bank,market,restaurant,pharmacy,post,hotel,station。返回严格JSON，字段完全匹配给定schema。`, time.Now().UnixNano())
	schema := `{"name":"镇名","theme":"小镇风貌","season":"季节","weather":"天气","ambient":"初到街头描述","project":{"kind":"英文标识","title":"内部剧情名","premise":"事件背景","successText":"协商成功后的现场变化","openingNpc":"npc id"},"buildings":[{"id":"school","name":"本局名称","kind":"school","summary":"场所描述"}],"npcs":[{"id":"唯一英文id","name":"中文名","role":"职业身份","personality":"性格","biography":"背景","mood":"当前情绪","activity":"当前活动","opening":"初次开口","concern":"真实顾虑","keywords":["具体条件"],"buildingId":"school","stakeholder":true}]}`
	messages := []Message{{Role: "system", Content: "你是中国社会生活模拟游戏的世界设计器。只返回一个完整、可解析的JSON对象，不要Markdown，不要解释，必须闭合所有括号。"}, {Role: "user", Content: prompt + "\nJSON schema:\n" + schema}}
	var lastErr error
	for attempt := 1; attempt <= 3; attempt++ {
		content, err := c.complete(ctx, messages, true)
		if err != nil {
			lastErr = err
		} else {
			var blueprint city.Blueprint
			if err := decodeJSON(content, &blueprint); err == nil {
				return blueprint, nil
			} else {
				lastErr = fmt.Errorf("第%d次响应JSON不完整或格式错误: %w", attempt, err)
			}
		}
		if ctx.Err() != nil {
			return city.Blueprint{}, ctx.Err()
		}
		if attempt < 3 {
			messages[1].Content = prompt + "\nJSON schema:\n" + schema + "\n上一次响应被截断或格式错误。请重新从头输出完整JSON，并适当缩短人物描述以确保能够完整结束。"
		}
	}
	return city.Blueprint{}, fmt.Errorf("模型连续3次未能返回完整的城镇蓝图JSON，通常是模型输出长度不足或网关截断。请换用支持更长输出的模型，或提高网关输出上限。最后错误: %w", lastErr)
}

func (c *Client) NPCReply(ctx context.Context, state *city.State, npc *city.NPC, history []Message, playerText string) (string, error) {
	stageRules := []string{
		"只透露与你本人直接相关的现象和有限背景，引导玩家走访其他人，不给完整方案。",
		"可以坦白自己的真实顾虑，但不能替其他人表态，也不能跳到最终结果。",
		"围绕具体条件谈判，只有玩家回应了现实顾虑才愿意参加正式协商。",
		"讨论书面承诺、执行责任和后续安排，不再制造新的核心矛盾。",
	}
	stage := state.Project.Stage
	if stage < 0 || stage >= len(stageRules) {
		stage = 0
	}
	system := fmt.Sprintf(`你现在是NPC“%s”，身份是%s。性格：%s。个人经历：%s。当前情绪：%s。正在做：%s。你在本局公共事件中的真实顾虑：%s。
这是一个中国现代小镇生活模拟器。你只能知道符合自己身份的信息，不能泄露系统、全局支持度、其他NPC秘密或剧情答案。始终以第一人称自然中文对话，回复1到4句。玩家真正回应了你的顾虑时可以松动态度，但不要轻易被空泛承诺说服。
剧情阶段：%s。阶段约束：%s
当前世界：%s 隐藏公共事件背景：%s`, npc.Name, npc.Role, npc.Personality, npc.Biography, npc.Mood, npc.Activity, npc.Concern, state.ProjectStageName(), stageRules[stage], state.PublicContext(), state.Project.Premise)
	messages := []Message{{Role: "system", Content: system}}
	if len(history) > 10 {
		history = history[len(history)-10:]
	}
	messages = append(messages, history...)
	messages = append(messages, Message{Role: "user", Content: playerText})
	return c.complete(ctx, messages, false)
}

func (c *Client) complete(ctx context.Context, messages []Message, jsonMode bool) (string, error) {
	timeout := c.config.DialogueTimeout
	if jsonMode {
		timeout = c.config.GenerationTimeout
	}
	requestCtx, cancel := context.WithTimeout(ctx, time.Duration(timeout)*time.Second)
	defer cancel()
	temperature := 0.85
	if jsonMode {
		temperature = 0.45
	}
	body := map[string]any{"model": c.config.Model, "messages": messages, "temperature": temperature, "stream": false}
	if jsonMode {
		body["response_format"] = map[string]string{"type": "json_object"}
		body["max_tokens"] = 10000
	}
	data, _ := json.Marshal(body)
	endpoint := completionEndpoint(c.config.BaseURL)
	var resp *http.Response
	var responseBody []byte
	var err error
	for attempt := 0; attempt < 3; attempt++ {
		req, err := http.NewRequestWithContext(requestCtx, http.MethodPost, endpoint, bytes.NewReader(data))
		if err != nil {
			return "", err
		}
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+c.config.APIKey)
		resp, err = c.http.Do(req)
		if err == nil {
			responseBody, err = io.ReadAll(io.LimitReader(resp.Body, 8<<20))
			resp.Body.Close()
		}
		if err == nil && !retryableStatus(resp.StatusCode) {
			break
		}
		if attempt == 2 || requestCtx.Err() != nil {
			if err != nil {
				break
			}
			break
		}
		delay := time.Duration(200*(attempt+1)) * time.Millisecond
		select {
		case <-time.After(delay):
		case <-requestCtx.Done():
			break
		}
	}
	if err != nil {
		if errors.Is(requestCtx.Err(), context.DeadlineExceeded) {
			return "", fmt.Errorf("模型在 %d 秒内没有完成响应。接口网络可达，但模型生成超时；可提高超时，或换用响应更快的模型", timeout)
		}
		return "", fmt.Errorf("调用模型失败: %w", err)
	}
	if resp == nil {
		return "", errors.New("模型接口没有返回响应")
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("模型接口返回 %d: %s", resp.StatusCode, strings.TrimSpace(string(responseBody)))
	}
	if len(bytes.TrimSpace(responseBody)) == 0 {
		return "", fmt.Errorf("模型接口返回了空响应（状态 %d，Content-Type %q，地址 %s）", resp.StatusCode, resp.Header.Get("Content-Type"), endpoint)
	}
	contentType := strings.ToLower(resp.Header.Get("Content-Type"))
	trimmedBody := bytes.TrimSpace(responseBody)
	if strings.Contains(contentType, "text/html") || bytes.HasPrefix(bytes.ToLower(trimmedBody), []byte("<!doctype html")) || bytes.HasPrefix(bytes.ToLower(trimmedBody), []byte("<html")) {
		return "", fmt.Errorf("模型地址返回了网页而不是 OpenAI 兼容 JSON。实际请求地址：%s。请不要填写网关首页，改为网关文档中的 API Base URL，通常是 https://域名/v1，也可以直接填写完整的 /chat/completions 地址", endpoint)
	}
	content, err := parseCompletionResponse(responseBody)
	if err != nil {
		snippet := strings.TrimSpace(string(responseBody))
		if len(snippet) > 500 {
			snippet = snippet[:500] + "..."
		}
		return "", fmt.Errorf("无法解析模型响应（Content-Type %q）: %w；响应片段: %s", resp.Header.Get("Content-Type"), err, snippet)
	}
	if strings.TrimSpace(content) == "" {
		return "", errors.New("模型没有返回内容")
	}
	return strings.TrimSpace(content), nil
}

func retryableStatus(status int) bool {
	return status == http.StatusTooManyRequests || status == http.StatusBadGateway || status == http.StatusServiceUnavailable || status == http.StatusGatewayTimeout
}

func boundedTimeout(value, fallback, minimum, maximum int) int {
	if value == 0 {
		return fallback
	}
	if value < minimum {
		return minimum
	}
	if value > maximum {
		return maximum
	}
	return value
}

func completionEndpoint(baseURL string) string {
	baseURL = strings.TrimRight(strings.TrimSpace(baseURL), "/")
	if strings.HasSuffix(baseURL, "/chat/completions") {
		return baseURL
	}
	return baseURL + "/chat/completions"
}

func parseCompletionResponse(body []byte) (string, error) {
	trimmed := bytes.TrimSpace(body)
	if bytes.HasPrefix(trimmed, []byte("data:")) {
		var combined strings.Builder
		for _, line := range strings.Split(string(trimmed), "\n") {
			line = strings.TrimSpace(line)
			if !strings.HasPrefix(line, "data:") {
				continue
			}
			payload := strings.TrimSpace(strings.TrimPrefix(line, "data:"))
			if payload == "" || payload == "[DONE]" {
				continue
			}
			part, err := parseCompletionJSON([]byte(payload))
			if err != nil {
				return "", err
			}
			combined.WriteString(part)
		}
		if combined.Len() == 0 {
			return "", errors.New("SSE 响应中没有模型内容")
		}
		return combined.String(), nil
	}
	return parseCompletionJSON(trimmed)
}

func parseCompletionJSON(body []byte) (string, error) {
	var result struct {
		Choices []struct {
			Message struct {
				Content          json.RawMessage `json:"content"`
				ReasoningContent string          `json:"reasoning_content"`
			} `json:"message"`
			Delta struct {
				Content json.RawMessage `json:"content"`
			} `json:"delta"`
			Text string `json:"text"`
		} `json:"choices"`
		OutputText string `json:"output_text"`
		Error      *struct {
			Message string `json:"message"`
		} `json:"error"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return "", err
	}
	if result.Error != nil {
		return "", errors.New(result.Error.Message)
	}
	if result.OutputText != "" {
		return result.OutputText, nil
	}
	if len(result.Choices) == 0 {
		return "", errors.New("响应中没有 choices")
	}
	choice := result.Choices[0]
	if content := decodeContent(choice.Message.Content); content != "" {
		return content, nil
	}
	if content := decodeContent(choice.Delta.Content); content != "" {
		return content, nil
	}
	if choice.Text != "" {
		return choice.Text, nil
	}
	if choice.Message.ReasoningContent != "" {
		return choice.Message.ReasoningContent, nil
	}
	return "", errors.New("choice 中没有可识别的 content")
}

func decodeContent(raw json.RawMessage) string {
	if len(raw) == 0 || string(raw) == "null" {
		return ""
	}
	var text string
	if json.Unmarshal(raw, &text) == nil {
		return text
	}
	var parts []struct {
		Type string `json:"type"`
		Text any    `json:"text"`
	}
	if json.Unmarshal(raw, &parts) != nil {
		return ""
	}
	var combined strings.Builder
	for _, part := range parts {
		switch value := part.Text.(type) {
		case string:
			combined.WriteString(value)
		case map[string]any:
			if text, ok := value["value"].(string); ok {
				combined.WriteString(text)
			}
		}
	}
	return combined.String()
}

func decodeJSON(content string, target any) error {
	content = strings.TrimSpace(content)
	content = strings.TrimPrefix(content, "```json")
	content = strings.TrimPrefix(content, "```")
	content = strings.TrimSuffix(content, "```")
	return json.Unmarshal([]byte(strings.TrimSpace(content)), target)
}
