import type { WorldTime } from './types';

export function createTime(): WorldTime {
  return { minutes: 8 * 60, day: 1, season: 'spring', weather: 'sunny' };
}

export function advanceTime(t: WorldTime, realDeltaMs: number, scale = 60): WorldTime {
  const minutes = (t.minutes + (realDeltaMs / 1000 / 60) * scale) % (24 * 60);
  const advanced = t.minutes + (realDeltaMs / 1000 / 60) * scale;
  let day = t.day;
  if (advanced >= 24 * 60) day += Math.floor(advanced / (24 * 60));
  const seasonIdx = Math.floor(((day - 1) % 360) / 90);
  const season: WorldTime['season'] = ['spring', 'summer', 'autumn', 'winter'][seasonIdx] as WorldTime['season'];
  return { ...t, minutes, day, season };
}

export function timeLabel(t: WorldTime): string {
  const h = Math.floor(t.minutes / 60);
  const m = Math.floor(t.minutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function isDaytime(t: WorldTime): boolean {
  return t.minutes >= 6 * 60 && t.minutes < 19 * 60;
}

export function weatherLabel(t: WorldTime): string {
  const map: Record<WorldTime['weather'], string> = {
    sunny: 'Sunny', cloudy: 'Cloudy', rain: 'Rain', storm: 'Storm', snow: 'Snow', fog: 'Fog'
  };
  return map[t.weather];
}
