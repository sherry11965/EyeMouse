import { startGame } from './core/game';

const boot = document.getElementById('boot');
if (boot) {
  boot.addEventListener('click', () => boot.classList.add('hidden'));
  setTimeout(() => boot.classList.add('hidden'), 2400);
}

startGame();
