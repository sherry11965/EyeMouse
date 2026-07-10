import 'nes.css/css/nes.min.css';
import { Game } from './core/game';
import { generateWorld } from './core/mapgen';
import { loadConfig } from './core/config';
import { setWorldData } from './world/worldState';
import { shouldShowTutorial, showTutorial } from './ui/tutorial';

let game: Game | null = null;
let generation = 0;

function setBoot(visible: boolean, text: string) {
  const boot = document.getElementById('boot');
  const label = boot?.querySelector('.loader-text');
  if (label) label.textContent = text;
  boot?.classList.toggle('hidden', !visible);
}

async function startNewWorld() {
  const token = ++generation;
  game?.destroy();
  game = null;
  document.getElementById('hud')!.innerHTML = '';
  document.getElementById('dialogue')!.innerHTML = '';
  document.getElementById('modal-root')!.innerHTML = '';
  localStorage.removeItem('ai-town.session');

  const config = loadConfig();
  setBoot(true, config.apiKey ? 'AI 正在生成新世界...' : '正在生成本地随机世界...');
  const world = await generateWorld(!!config.apiKey);
  if (token !== generation) return;
  setWorldData(world);

  const canvas = document.getElementById('game') as HTMLCanvasElement;
  game = new Game(canvas, world, startNewWorld);
  game.start();
  setBoot(false, '世界已生成');
  canvas.focus();
}

async function bootGame() {
  if (shouldShowTutorial()) {
    const boot = document.getElementById('boot');
    setBoot(true, '准备进入世界...');
    await new Promise<void>(resolve => {
      setTimeout(() => {
        boot?.classList.add('hidden');
        showTutorial(resolve);
      }, 600);
    });
  }
  await startNewWorld();
}

void bootGame().catch(error => {
  console.error('Failed to start world', error);
  setBoot(true, `世界生成失败：${error instanceof Error ? error.message : String(error)}`);
});
