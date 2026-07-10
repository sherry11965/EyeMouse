import type { LLMConfig } from '../core/types';
import { DEFAULT_CONFIG } from '../core/config';

export function ensureConfigModal(onSave: (cfg: LLMConfig) => void) {
  const root = document.getElementById('modal-root')!;
  if (root.querySelector('[data-config]')) return;
  const current = (() => {
    try { return { ...DEFAULT_CONFIG, ...(JSON.parse(localStorage.getItem('ai-town.llm') || '{}') as LLMConfig) }; }
    catch { return { ...DEFAULT_CONFIG }; }
  })();

  const div = document.createElement('div');
  div.dataset.config = '1';
  div.innerHTML = `
    <div class="modal-backdrop">
      <section class="nes-container is-dark with-title modal-card">
        <p class="title">连接你的大模型</p>
        <p class="nes-text is-disabled modal-desc">输入任意 OpenAI 兼容的接口地址（Endpoint）和密钥（Key）。仅保存在你浏览器的 localStorage 中，不会上传到任何第三方。</p>
        <div class="nes-field">
          <label>接口地址 (Endpoint)</label>
          <input id="cfg-endpoint" type="text" class="nes-input is-dark" placeholder="https://api.openai.com/v1/chat/completions" />
        </div>
        <div class="nes-field">
          <label>密钥 (API Key)</label>
          <input id="cfg-key" type="password" class="nes-input is-dark" placeholder="sk-..." />
        </div>
        <div class="nes-field">
          <label>模型 (Model)</label>
          <input id="cfg-model" type="text" class="nes-input is-dark" placeholder="gpt-4o-mini" />
        </div>
        <div class="nes-field">
          <label>每日 Token 上限</label>
          <input id="cfg-budget" type="number" class="nes-input is-dark" value="200000" min="10000" />
        </div>
        <div class="modal-row">
          <button class="nes-btn" id="cfg-cancel">取消</button>
          <button class="nes-btn is-primary" id="cfg-save">保存</button>
        </div>
      </section>
    </div>
  `;
  root.appendChild(div);

  (div.querySelector('#cfg-endpoint') as HTMLInputElement).value = current.endpoint;
  (div.querySelector('#cfg-key') as HTMLInputElement).value = current.apiKey;
  (div.querySelector('#cfg-model') as HTMLInputElement).value = current.model;
  (div.querySelector('#cfg-budget') as HTMLInputElement).value = String(current.dailyTokenBudget);

  div.querySelector('#cfg-cancel')!.addEventListener('click', () => div.remove());
  div.querySelector('#cfg-save')!.addEventListener('click', () => {
    const cfg: LLMConfig = {
      endpoint: (div.querySelector('#cfg-endpoint') as HTMLInputElement).value.trim() || DEFAULT_CONFIG.endpoint,
      apiKey: (div.querySelector('#cfg-key') as HTMLInputElement).value.trim(),
      model: (div.querySelector('#cfg-model') as HTMLInputElement).value.trim() || DEFAULT_CONFIG.model,
      maxConcurrency: DEFAULT_CONFIG.maxConcurrency,
      dailyTokenBudget: Math.max(10000, parseInt((div.querySelector('#cfg-budget') as HTMLInputElement).value, 10) || 200000)
    };
    localStorage.setItem('ai-town.llm', JSON.stringify(cfg));
    onSave(cfg);
    div.remove();
  });
}
