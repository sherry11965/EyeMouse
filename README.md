# AI Town · AI小镇

A pixel-art AI life simulator where LLM-driven residents live, work, and chat in a multi-region town. Observe, interact, or guide their stories.

像素风 AI 生活小镇：多名 LLM 驱动的居民在多区域世界中自主决策、对话、社交，玩家可以观察、互动或推进剧情。

## Features
- LLM-driven resident decisions (intent → action → dialogue)
- Multi-region pixel world (plaza, residential, shops, farm, forest, seaside)
- Long/short-term memory + relationship graph
- Event system + main/side quests
- Player avatar with dialogue, building mode, save/load

## Stack
- Vite + TypeScript (vanilla)
- HTML Canvas 2D
- OpenAI-compatible LLM API (user-supplied key, localStorage)

## Run

```bash
npm install
npm run dev
```

Open the URL shown, then press **Esc** to enter your API key & endpoint (OpenAI-compatible). Save → the town starts.

## Controls
- WASD / Arrows — Move
- Space / E — Interact / Talk
- I — Inventory
- Q — Quest log
- M — Travel to a region
- Esc — Pause / Settings
