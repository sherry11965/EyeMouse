import type { ResidentPersona } from '../core/types';

const palette = [
  { hair: '#3b2f2f', skin: '#f1c9a5', shirt: '#f472b6', pants: '#831843' },
  { hair: '#1f2937', skin: '#fcd9b6', shirt: '#60a5fa', pants: '#1e3a8a' },
  { hair: '#78350f', skin: '#e9b598', shirt: '#34d399', pants: '#064e3b' },
  { hair: '#7f1d1d', skin: '#fcd9b6', shirt: '#f87171', pants: '#7f1d1d' },
  { hair: '#1e1b4b', skin: '#e9b598', shirt: '#a78bfa', pants: '#4c1d95' },
  { hair: '#92400e', skin: '#f1c9a5', shirt: '#fbbf24', pants: '#78350f' }
];

export function personaColor(p: ResidentPersona): typeof palette[number] {
  const idx = hashStr(p.id) % palette.length;
  return palette[idx];
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
