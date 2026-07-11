package ai

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
)

func TestOpenAICompatibleBlueprintRequest(t *testing.T) {
	var path, auth string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path, auth = r.URL.Path, r.Header.Get("Authorization")
		var request map[string]any
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			t.Fatal(err)
		}
		if request["model"] != "test-model" {
			t.Fatalf("unexpected model: %v", request["model"])
		}
		blueprint := `{"name":"测试镇","theme":"现代工业小镇","season":"春季","weather":"晴","ambient":"学校刚打铃。","project":{"kind":"bridge","title":"修桥协商","premise":"桥梁维修影响通勤和商户。","successText":"各方同意分段施工。","openingNpc":"planner"},"buildings":[],"npcs":[{"id":"planner","name":"林规划","role":"规划员","personality":"严谨","biography":"负责城建","mood":"忙碌","activity":"看图纸","opening":"先听听居民。","concern":"施工不能切断医院通道。","keywords":["分段","通道"],"buildingId":"government","stakeholder":true}]}`
		_ = json.NewEncoder(w).Encode(map[string]any{"choices": []any{map[string]any{"message": map[string]string{"role": "assistant", "content": blueprint}}}})
	}))
	defer server.Close()
	client, err := New(Config{BaseURL: server.URL, APIKey: "secret", Model: "test-model"})
	if err != nil {
		t.Fatal(err)
	}
	blueprint, err := client.GenerateBlueprint(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if path != "/chat/completions" || auth != "Bearer secret" {
		t.Fatalf("unexpected OpenAI request path=%s auth=%s", path, auth)
	}
	if blueprint.Name != "测试镇" || !strings.Contains(blueprint.Project.Premise, "维修") {
		t.Fatalf("unexpected blueprint: %+v", blueprint)
	}
}

func TestAPIKeyIsTrimmedBeforeRequest(t *testing.T) {
	var auth string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		auth = r.Header.Get("Authorization")
		_ = json.NewEncoder(w).Encode(map[string]any{"choices": []any{map[string]any{"message": map[string]string{"content": "ok"}}}})
	}))
	defer server.Close()
	client, err := New(Config{BaseURL: server.URL, APIKey: "  secret\r\n", Model: "test-model"})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := client.complete(context.Background(), []Message{{Role: "user", Content: "test"}}, false); err != nil {
		t.Fatal(err)
	}
	if auth != "Bearer secret" {
		t.Fatalf("unexpected authorization header %q", auth)
	}
}

func TestWhitespaceOnlyAPIKeyIsRejected(t *testing.T) {
	if _, err := New(Config{APIKey: " \r\n", Model: "test-model"}); err == nil || !strings.Contains(err.Error(), "API Key") {
		t.Fatalf("expected API Key validation error, got %v", err)
	}
}

func TestCompletionEndpointAcceptsFullPath(t *testing.T) {
	if got := completionEndpoint("https://example.com/v1/chat/completions"); got != "https://example.com/v1/chat/completions" {
		t.Fatalf("unexpected endpoint %s", got)
	}
	if got := completionEndpoint("https://example.com/v1/"); got != "https://example.com/v1/chat/completions" {
		t.Fatalf("unexpected endpoint %s", got)
	}
}

func TestParseArrayContentResponse(t *testing.T) {
	body := []byte(`{"choices":[{"message":{"content":[{"type":"text","text":"{\"name\":\"数组镇\"}"}]}}]}`)
	content, err := parseCompletionResponse(body)
	if err != nil {
		t.Fatal(err)
	}
	if content != `{"name":"数组镇"}` {
		t.Fatalf("unexpected content %s", content)
	}
}

func TestParseSSEResponse(t *testing.T) {
	body := []byte("data: {\"choices\":[{\"delta\":{\"content\":\"前半\"}}]}\n\ndata: {\"choices\":[{\"delta\":{\"content\":\"后半\"}}]}\n\ndata: [DONE]\n")
	content, err := parseCompletionResponse(body)
	if err != nil {
		t.Fatal(err)
	}
	if content != "前半后半" {
		t.Fatalf("unexpected SSE content %s", content)
	}
}

func TestEmptySuccessfulResponseHasUsefulError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()
	client, err := New(Config{BaseURL: server.URL, APIKey: "secret", Model: "test-model"})
	if err != nil {
		t.Fatal(err)
	}
	_, err = client.complete(context.Background(), []Message{{Role: "user", Content: "test"}}, false)
	if err == nil || !strings.Contains(err.Error(), "空响应") {
		t.Fatalf("expected useful empty response error, got %v", err)
	}
}

func TestHTMLResponseExplainsIncorrectBaseURL(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		_, _ = w.Write([]byte("<!doctype html><html><body>gateway</body></html>"))
	}))
	defer server.Close()
	client, err := New(Config{BaseURL: server.URL, APIKey: "secret", Model: "test-model"})
	if err != nil {
		t.Fatal(err)
	}
	_, err = client.complete(context.Background(), []Message{{Role: "user", Content: "test"}}, false)
	if err == nil || !strings.Contains(err.Error(), "网页而不是 OpenAI 兼容 JSON") || !strings.Contains(err.Error(), server.URL+"/chat/completions") {
		t.Fatalf("expected actionable HTML response error, got %v", err)
	}
}

func TestTimeoutConfigurationUsesDefaultsAndBounds(t *testing.T) {
	client, err := New(Config{BaseURL: "https://example.com/v1", APIKey: "secret", Model: "model"})
	if err != nil {
		t.Fatal(err)
	}
	if client.config.GenerationTimeout != 300 || client.config.DialogueTimeout != 120 {
		t.Fatalf("unexpected defaults: generation=%d dialogue=%d", client.config.GenerationTimeout, client.config.DialogueTimeout)
	}
	client, err = New(Config{BaseURL: "https://example.com/v1", APIKey: "secret", Model: "model", GenerationTimeout: 2000, DialogueTimeout: 2})
	if err != nil {
		t.Fatal(err)
	}
	if client.config.GenerationTimeout != 900 || client.config.DialogueTimeout != 30 {
		t.Fatalf("timeouts were not bounded: generation=%d dialogue=%d", client.config.GenerationTimeout, client.config.DialogueTimeout)
	}
}

func TestCompletionRetriesTransientGatewayErrors(t *testing.T) {
	var attempts atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		if attempts.Add(1) < 3 {
			w.WriteHeader(http.StatusBadGateway)
			return
		}
		_ = json.NewEncoder(w).Encode(map[string]any{"choices": []any{map[string]any{"message": map[string]string{"content": "恢复成功"}}}})
	}))
	defer server.Close()
	client, err := New(Config{BaseURL: server.URL, APIKey: "secret", Model: "test-model"})
	if err != nil {
		t.Fatal(err)
	}
	content, err := client.complete(context.Background(), []Message{{Role: "user", Content: "test"}}, false)
	if err != nil {
		t.Fatal(err)
	}
	if content != "恢复成功" || attempts.Load() != 3 {
		t.Fatalf("unexpected retry result content=%q attempts=%d", content, attempts.Load())
	}
}

func TestBlueprintRetriesTruncatedJSON(t *testing.T) {
	var attempts atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		attempt := attempts.Add(1)
		content := `{"name":"截断镇"`
		if attempt == 2 {
			content = `{"name":"恢复镇","theme":"生活小镇","season":"春季","weather":"晴","ambient":"居民正在出门。","project":{"kind":"community","title":"小区改造","premise":"居民协商公共空间。","successText":"方案通过。","openingNpc":"director"},"buildings":[],"npcs":[{"id":"director","name":"许岚","role":"业委会主任","personality":"认真","biography":"长期服务社区","mood":"忙碌","activity":"登记意见","opening":"先听居民说。","concern":"要照顾不同居民。","keywords":["居民"],"buildingId":"community","stakeholder":true}]}`
		}
		_ = json.NewEncoder(w).Encode(map[string]any{"choices": []any{map[string]any{"message": map[string]string{"content": content}}}})
	}))
	defer server.Close()
	client, err := New(Config{BaseURL: server.URL, APIKey: "secret", Model: "test-model"})
	if err != nil {
		t.Fatal(err)
	}
	blueprint, err := client.GenerateBlueprint(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if blueprint.Name != "恢复镇" || attempts.Load() != 2 {
		t.Fatalf("unexpected retry result blueprint=%s attempts=%d", blueprint.Name, attempts.Load())
	}
}

func TestBlueprintTruncationHasActionableError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{"choices": []any{map[string]any{"message": map[string]string{"content": `{"name":"始终截断"`}}}})
	}))
	defer server.Close()
	client, err := New(Config{BaseURL: server.URL, APIKey: "secret", Model: "test-model"})
	if err != nil {
		t.Fatal(err)
	}
	_, err = client.GenerateBlueprint(context.Background())
	if err == nil || !strings.Contains(err.Error(), "连续3次") || !strings.Contains(err.Error(), "输出长度") {
		t.Fatalf("expected actionable truncation error, got %v", err)
	}
}
