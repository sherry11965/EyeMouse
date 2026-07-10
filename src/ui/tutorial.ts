const TUTORIAL_KEY = 'ai-town.tutorial-seen';

const STEPS = [
  {
    title: '欢迎来到 AI 小镇！',
    text: '这是一个由 AI 驱动的像素世界，居民们有自己的生活和想法。',
    hint: '点击继续'
  },
  {
    title: '移动',
    text: '使用 WASD 或方向键移动你的角色。',
    hint: 'WASD / 方向键'
  },
  {
    title: '与居民互动',
    text: '靠近居民后按空格键或 E 键与他们对话。',
    hint: '空格 / E'
  },
  {
    title: '探索世界',
    text: '按 M 键打开地图，前往不同区域探索。',
    hint: 'M 键'
  },
  {
    title: '设置',
    text: '按 Esc 键打开设置菜单，可以配置 AI 接口。',
    hint: 'Esc 键'
  },
  {
    title: '开始冒险！',
    text: '现在你已经准备好了，去认识这个小镇的居民吧！',
    hint: '点击开始游戏'
  }
];

export function shouldShowTutorial(): boolean {
  return !localStorage.getItem(TUTORIAL_KEY);
}

export function markTutorialSeen(): void {
  localStorage.setItem(TUTORIAL_KEY, '1');
}

export function showTutorial(onComplete: () => void): void {
  const root = document.getElementById('tutorial-root');
  if (!root) {
    onComplete();
    return;
  }

  let currentStep = 0;

  function render() {
    const step = STEPS[currentStep];
    const isLast = currentStep === STEPS.length - 1;

    root!.innerHTML = `
      <div class="tutorial-box">
        <div class="tutorial-step">${currentStep + 1} / ${STEPS.length}</div>
        <h2 class="tutorial-title">${step.title}</h2>
        <p class="tutorial-text">${step.text}</p>
        <div class="tutorial-hint">${step.hint}</div>
        <div class="tutorial-progress">
          ${STEPS.map((_, i) => `<span class="dot${i <= currentStep ? ' active' : ''}"></span>`).join('')}
        </div>
      </div>
    `;

    root!.onclick = () => {
      if (isLast) {
        markTutorialSeen();
        root!.innerHTML = '';
        root!.style.display = 'none';
        onComplete();
      } else {
        currentStep++;
        render();
      }
    };
  }

  root.style.display = 'flex';
  render();
}
