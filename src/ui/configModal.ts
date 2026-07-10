import { DEFAULT_CONFIG } from '../core/config';
import type { LLMConfig } from '../core/types';

export function ensureConfigModal(onSave: (cfg: LLMConfig) => void) {
  const root = document.getElementById('modal-root')!;
  if (root.querySelector('.modal[data-config]')) return;
  const current = (() => {
    try { return { ...DEFAULT_CONFIG, ...(JSON.parse(localStorage.getItem('ai-town.llm') || '{}') as LLMConfig) }; }
    catch { return { ...DEFAULT_CONFIG }; }
  })();

  const div = document.createElement('div');
  div.className = 'modal';
  div.dataset.config = '1';
  div.innerHTML = `
    <h2>Connect your LLM</h2>
    <p>Enter any OpenAI-compatible endpoint + key. Stored only in your browser (localStorage).</p>
    <div class="field">
      <label>Endpoint</label>
      <input id="cfg-endpoint" type="text" placeholder="https://api.openai.com/v1/chat/completions" />
    </div>
    <div class="field">
      <label>API Key</label>
      <input id="cfg-key" type="password" placeholder="sk-..." />
    </div>
    <div class="field">
      <label>Model</label>
      <input id="cfg-model" type="text" placeholder="gpt-4o-mini" />
    </div>
    <div class="field">
      <label>Daily token budget</label>
      <input id="cfg-budget" type="number" value="200000" min="10000" />
    </div>
    <div class="row">
      <button class="ghost" id="cfg-cancel">Cancel</button>
      <button id="cfg-save">Save</button>
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
