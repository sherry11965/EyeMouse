import { startGame } from './core/game';
import { shouldShowTutorial, showTutorial } from './ui/tutorial';

const boot = document.getElementById('boot');
if (boot) {
  boot.addEventListener('click', () => boot.classList.add('hidden'));
  setTimeout(() => boot.classList.add('hidden'), 2400);
}

if (shouldShowTutorial()) {
  setTimeout(() => {
    boot?.classList.add('hidden');
    showTutorial(() => {
      startGame();
    });
  }, 1500);
} else {
  startGame();
}
