const W = 16;
const H = 16;

type Color = string | null;

const T = null;

export function createSpriteAtlas(): HTMLCanvasElement {
  const cols = 16;
  const rows = 24;
  const canvas = document.createElement('canvas');
  canvas.width = W * cols;
  canvas.height = H * rows;
  const ctx = canvas.getContext('2d')!;

  const sprites: Color[][][] = [
    ...characterSprites(),
    ...terrainTiles(),
    ...buildingTiles(),
    ...objectTiles(),
    ...uiTiles(),
  ];

  for (let i = 0; i < sprites.length; i++) {
    const px = (i % cols) * W;
    const py = Math.floor(i / cols) * H;
    drawSprite(ctx, sprites[i], px, py);
  }

  return canvas;
}

function drawSprite(ctx: CanvasRenderingContext2D, pixels: Color[][], ox: number, oy: number) {
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const c = pixels[y]?.[x];
      if (c) {
        ctx.fillStyle = c;
        ctx.fillRect(ox + x, oy + y, 1, 1);
      }
    }
  }
}

function characterSprites(): Color[][][] {
  const chars: Array<{ hair: string; skin: string; shirt: string; pants: string; shoes: string }> = [
    { hair: '#8b5a3c', skin: '#ffd5b8', shirt: '#ff7eb3', pants: '#4a5568', shoes: '#9b80f0' },
    { hair: '#4a5568', skin: '#ffe5a0', shirt: '#4fc3f7', pants: '#4a5568', shoes: '#ff9a76' },
    { hair: '#9b80f0', skin: '#ffd5b8', shirt: '#4fd1a0', pants: '#4a5568', shoes: '#ffd93d' },
    { hair: '#ff6b6b', skin: '#ffe5a0', shirt: '#ff9a76', pants: '#4a5568', shoes: '#a0aec0' },
    { hair: '#4fc3f7', skin: '#ffd5b8', shirt: '#c4b5fd', pants: '#4a5568', shoes: '#ffb8a0' },
    { hair: '#ff9a76', skin: '#ffe5a0', shirt: '#ffd93d', pants: '#4a5568', shoes: '#90cdf4' },
  ];

  const frames: Color[][][] = [];
  for (const c of chars) {
    for (let dir = 0; dir < 4; dir++) {
      for (let step = 0; step < 4; step++) {
        frames.push(makeCharFrame(c, dir, step));
      }
    }
  }
  return frames;
}

function makeCharFrame(
  c: { hair: string; skin: string; shirt: string; pants: string; shoes: string },
  dir: number,
  step: number
): Color[][] {
  const px: Color[][] = Array.from({ length: H }, () => Array(W).fill(null));

  const bob = (step === 1 || step === 3) ? -1 : 0;
  const legL = step % 2 === 0;
  const legR = !legL;

  if (dir === 0) {
    setRow(px, 2 + bob, 6, 4, c.hair);
    setRow(px, 3 + bob, 6, 4, c.hair);
    setRow(px, 4 + bob, 6, 4, c.skin);
    px[4 + bob][7] = '#4a5568'; px[4 + bob][8] = '#4a5568';
    setRow(px, 5 + bob, 6, 4, c.skin);
    setRow(px, 6 + bob, 5, 6, c.shirt);
    setRow(px, 7 + bob, 5, 6, c.shirt);
    setRow(px, 8 + bob, 5, 6, c.shirt);
    if (legL) { setRow(px, 9 + bob, 6, 2, c.pants); setRow(px, 10 + bob, 6, 2, c.pants); }
    if (legR) { setRow(px, 9 + bob, 8, 2, c.pants); setRow(px, 10 + bob, 8, 2, c.pants); }
    px[11 + bob][6] = c.shoes; px[11 + bob][7] = c.shoes;
    px[11 + bob][8] = c.shoes; px[11 + bob][9] = c.shoes;
  } else if (dir === 1) {
    setRow(px, 2 + bob, 6, 4, c.hair);
    setRow(px, 3 + bob, 6, 4, c.hair);
    setRow(px, 4 + bob, 6, 4, c.skin);
    px[4 + bob][7] = '#4a5568';
    setRow(px, 5 + bob, 6, 4, c.skin);
    setRow(px, 6 + bob, 5, 6, c.shirt);
    setRow(px, 7 + bob, 5, 6, c.shirt);
    setRow(px, 8 + bob, 5, 6, c.shirt);
    if (legL) { setRow(px, 9 + bob, 6, 2, c.pants); setRow(px, 10 + bob, 6, 2, c.pants); }
    if (legR) { setRow(px, 9 + bob, 8, 2, c.pants); setRow(px, 10 + bob, 8, 2, c.pants); }
    px[11 + bob][6] = c.shoes; px[11 + bob][7] = c.shoes;
    px[11 + bob][8] = c.shoes; px[11 + bob][9] = c.shoes;
  } else if (dir === 2) {
    setRow(px, 2 + bob, 6, 4, c.hair);
    setRow(px, 3 + bob, 6, 4, c.hair);
    setRow(px, 4 + bob, 6, 4, c.skin);
    px[4 + bob][9] = '#4a5568';
    setRow(px, 5 + bob, 6, 4, c.skin);
    setRow(px, 6 + bob, 5, 6, c.shirt);
    setRow(px, 7 + bob, 5, 6, c.shirt);
    setRow(px, 8 + bob, 5, 6, c.shirt);
    if (legL) { setRow(px, 9 + bob, 6, 2, c.pants); setRow(px, 10 + bob, 6, 2, c.pants); }
    if (legR) { setRow(px, 9 + bob, 8, 2, c.pants); setRow(px, 10 + bob, 8, 2, c.pants); }
    px[11 + bob][6] = c.shoes; px[11 + bob][7] = c.shoes;
    px[11 + bob][8] = c.shoes; px[11 + bob][9] = c.shoes;
  } else {
    setRow(px, 2 + bob, 6, 4, c.hair);
    setRow(px, 3 + bob, 6, 4, c.hair);
    setRow(px, 4 + bob, 6, 4, c.hair);
    setRow(px, 5 + bob, 6, 4, c.hair);
    setRow(px, 6 + bob, 5, 6, c.shirt);
    setRow(px, 7 + bob, 5, 6, c.shirt);
    setRow(px, 8 + bob, 5, 6, c.shirt);
    if (legL) { setRow(px, 9 + bob, 6, 2, c.pants); setRow(px, 10 + bob, 6, 2, c.pants); }
    if (legR) { setRow(px, 9 + bob, 8, 2, c.pants); setRow(px, 10 + bob, 8, 2, c.pants); }
    px[11 + bob][6] = c.shoes; px[11 + bob][7] = c.shoes;
    px[11 + bob][8] = c.shoes; px[11 + bob][9] = c.shoes;
  }

  return px;
}

function setRow(px: Color[][], y: number, x: number, len: number, color: string) {
  for (let i = 0; i < len; i++) {
    if (y >= 0 && y < H && x + i >= 0 && x + i < W) px[y][x + i] = color;
  }
}

function terrainTiles(): Color[][][] {
  const grass = (): Color[][] => {
    const px: Color[][] = Array.from({ length: H }, () => Array(W).fill('#7ec87e'));
    for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) px[y][x] = '#6ab86a';
    for (let i = 0; i < 6; i++) {
      const gx = (i * 7 + 3) % W, gy = (i * 11 + 5) % H;
      px[gy][gx] = '#8ed88e';
    }
    return px;
  };

  const dirt = (): Color[][] => {
    const px: Color[][] = Array.from({ length: H }, () => Array(W).fill('#d4a574'));
    for (let y = 0; y < H; y += 3) for (let x = 0; x < W; x += 3) px[y][x] = '#c49564';
    for (let i = 0; i < 4; i++) {
      const dx = (i * 5 + 2) % W, dy = (i * 7 + 1) % H;
      px[dy][dx] = '#e4b584';
    }
    return px;
  };

  const water = (): Color[][] => {
    const px: Color[][] = Array.from({ length: H }, () => Array(W).fill('#5dade2'));
    for (let y = 0; y < H; y += 4) for (let x = 0; x < W; x++) px[y][x] = '#7ec8e3';
    for (let i = 0; i < 5; i++) {
      const wx = (i * 7 + 1) % W, wy = (i * 3 + 2) % H;
      px[wy][wx] = '#aed6f1';
    }
    return px;
  };

  const stone = (): Color[][] => {
    const px: Color[][] = Array.from({ length: H }, () => Array(W).fill('#a0a8b0'));
    for (let y = 0; y < H; y += 4) for (let x = 0; x < W; x += 4) px[y][x] = '#909aa0';
    for (let x = 0; x < W; x += 4) px[2][x] = '#b0b8c0';
    return px;
  };

  const sand = (): Color[][] => {
    const px: Color[][] = Array.from({ length: H }, () => Array(W).fill('#f5deb3'));
    for (let y = 0; y < H; y += 3) for (let x = 0; x < W; x += 3) px[y][x] = '#e8d5a0';
    for (let i = 0; i < 3; i++) {
      const sx = (i * 5 + 3) % W, sy = (i * 4 + 7) % H;
      px[sy][sx] = '#fff0c0';
    }
    return px;
  };

  const darkGrass = (): Color[][] => {
    const px: Color[][] = Array.from({ length: H }, () => Array(W).fill('#5a9c4f'));
    for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) px[y][x] = '#4a8c3f';
    for (let i = 0; i < 4; i++) {
      const dx = (i * 6 + 4) % W, dy = (i * 5 + 3) % H;
      px[dy][dx] = '#6aac5f';
    }
    return px;
  };

  const cobble = (): Color[][] => {
    const px: Color[][] = Array.from({ length: H }, () => Array(W).fill('#b8b0a0'));
    for (let y = 0; y < H; y += 4) {
      for (let x = 0; x < W; x += 4) {
        px[y][x] = '#a8a090'; px[y][x + 1] = '#a8a090';
        px[y + 1][x] = '#a8a090';
      }
    }
    for (let y = 2; y < H; y += 4) {
      for (let x = 2; x < W; x += 4) {
        px[y][x] = '#c8c0b0';
      }
    }
    return px;
  };

  return [grass(), dirt(), water(), stone(), sand(), darkGrass(), cobble()];
}

function buildingTiles(): Color[][][] {
  const wall = (): Color[][] => {
    const px: Color[][] = Array.from({ length: H }, () => Array(W).fill('#e8a090'));
    for (let x = 0; x < W; x += 4) { px[0][x] = '#d89080'; px[1][x] = '#d89080'; }
    for (let y = 0; y < H; y += 4) { px[y][0] = '#d89080'; px[y][1] = '#d89080'; }
    return px;
  };

  const roof = (): Color[][] => {
    const px: Color[][] = Array.from({ length: H }, () => Array(W).fill('#c080d0'));
    for (let x = 0; x < W; x += 2) px[0][x] = '#a060b0';
    for (let y = 0; y < H; y += 3) for (let x = 0; x < W; x++) px[y][x] = '#b070c0';
    return px;
  };

  const door = (): Color[][] => {
    const px: Color[][] = Array.from({ length: H }, () => Array(W).fill('#e8a090'));
    px[6][6] = '#8b6914'; px[6][7] = '#8b6914'; px[6][8] = '#8b6914'; px[6][9] = '#8b6914';
    for (let y = 7; y < 14; y++) { px[y][6] = '#8b6914'; px[y][7] = '#a07820'; px[y][8] = '#a07820'; px[y][9] = '#8b6914'; }
    px[10][8] = '#f0c040';
    return px;
  };

  const window = (): Color[][] => {
    const px: Color[][] = Array.from({ length: H }, () => Array(W).fill('#e8a090'));
    for (let y = 5; y < 10; y++) for (let x = 5; x < 10; x++) px[y][x] = '#87ceeb';
    px[5][5] = '#8b6914'; px[5][9] = '#8b6914'; px[9][5] = '#8b6914'; px[9][9] = '#8b6914';
    px[7][5] = '#8b6914'; px[7][9] = '#8b6914'; px[5][7] = '#8b6914'; px[9][7] = '#8b6914';
    return px;
  };

  const woodFloor = (): Color[][] => {
    const px: Color[][] = Array.from({ length: H }, () => Array(W).fill('#d4a574'));
    for (let y = 0; y < H; y += 4) for (let x = 0; x < W; x++) px[y][x] = '#c49564';
    for (let x = 0; x < W; x += 8) for (let y = 0; y < H; y++) px[y][x] = '#c49564';
    return px;
  };

  return [wall(), roof(), door(), window(), woodFloor()];
}

function objectTiles(): Color[][][] {
  const tree = (): Color[][] => {
    const px: Color[][] = Array.from({ length: H }, () => Array(W).fill(null));
    for (let y = 1; y < 5; y++) for (let x = 4; x < 12; x++) px[y][x] = '#4ecb71';
    for (let y = 0; y < 3; y++) for (let x = 5; x < 11; x++) px[y][x] = '#5edb81';
    px[1][6] = '#6eec91'; px[2][9] = '#6eec91';
    for (let y = 5; y < 14; y++) { px[y][7] = '#a07840'; px[y][8] = '#907030'; }
    return px;
  };

  const pine = (): Color[][] => {
    const px: Color[][] = Array.from({ length: H }, () => Array(W).fill(null));
    for (let y = 0; y < 2; y++) for (let x = 7; x < 9; x++) px[y][x] = '#2d8a4e';
    for (let y = 2; y < 4; y++) for (let x = 5; x < 11; x++) px[y][x] = '#3a9a5e';
    for (let y = 4; y < 7; y++) for (let x = 4; x < 12; x++) px[y][x] = '#2d8a4e';
    for (let y = 7; y < 14; y++) { px[y][7] = '#8b6914'; px[y][8] = '#7a5a10'; }
    return px;
  };

  const flower = (): Color[][] => {
    const px: Color[][] = Array.from({ length: H }, () => Array(W).fill(null));
    px[8][7] = '#4ecb71'; px[9][7] = '#4ecb71'; px[10][7] = '#4ecb71';
    px[6][7] = '#ff6b6b'; px[6][8] = '#ff6b6b'; px[7][7] = '#ffd93d';
    px[5][7] = '#ff6b6b';
    return px;
  };

  const bush = (): Color[][] => {
    const px: Color[][] = Array.from({ length: H }, () => Array(W).fill(null));
    for (let y = 8; y < 12; y++) for (let x = 4; x < 12; x++) px[y][x] = '#4ecb71';
    for (let y = 9; y < 11; y++) for (let x = 5; x < 11; x++) px[y][x] = '#5edb81';
    px[9][6] = '#ff6b6b'; px[10][9] = '#ffd93d';
    return px;
  };

  const fountain = (): Color[][] => {
    const px: Color[][] = Array.from({ length: H }, () => Array(W).fill(null));
    for (let y = 4; y < 12; y++) for (let x = 3; x < 13; x++) px[y][x] = '#c0c8d0';
    for (let y = 5; y < 11; y++) for (let x = 4; x < 12; x++) px[y][x] = '#87ceeb';
    for (let y = 6; y < 10; y++) for (let x = 5; x < 11; x++) px[y][x] = '#a0e0f0';
    px[7][7] = '#e0f0f8'; px[7][8] = '#e0f0f8';
    px[3][7] = '#c0c8d0'; px[3][8] = '#c0c8d0';
    px[2][7] = '#87ceeb'; px[2][8] = '#87ceeb';
    return px;
  };

  const bench = (): Color[][] => {
    const px: Color[][] = Array.from({ length: H }, () => Array(W).fill(null));
    for (let x = 3; x < 13; x++) px[7][x] = '#a07840';
    for (let x = 3; x < 13; x++) px[8][x] = '#907030';
    px[9][4] = '#907030'; px[9][5] = '#907030'; px[9][10] = '#907030'; px[9][11] = '#907030';
    px[10][4] = '#907030'; px[10][5] = '#907030'; px[10][10] = '#907030'; px[10][11] = '#907030';
    return px;
  };

  const signpost = (): Color[][] => {
    const px: Color[][] = Array.from({ length: H }, () => Array(W).fill(null));
    px[7][7] = '#a07840'; px[8][7] = '#a07840'; px[9][7] = '#a07840'; px[10][7] = '#a07840'; px[11][7] = '#a07840';
    for (let y = 3; y < 7; y++) for (let x = 4; x < 12; x++) px[y][x] = '#ffd93d';
    px[4][5] = '#a07840'; px[4][9] = '#a07840';
    return px;
  };

  const rock = (): Color[][] => {
    const px: Color[][] = Array.from({ length: H }, () => Array(W).fill(null));
    for (let y = 9; y < 13; y++) for (let x = 5; x < 11; x++) px[y][x] = '#808890';
    for (let y = 10; y < 12; y++) for (let x = 6; x < 10; x++) px[y][x] = '#909aa0';
    px[10][7] = '#a0a8b0';
    return px;
  };

  const lamp = (): Color[][] => {
    const px: Color[][] = Array.from({ length: H }, () => Array(W).fill(null));
    for (let y = 4; y < 14; y++) { px[y][7] = '#4a5568'; px[y][8] = '#4a5568'; }
    for (let x = 5; x < 11; x++) px[3][x] = '#4a5568';
    px[2][6] = '#ffd93d'; px[2][7] = '#ffe066'; px[2][8] = '#ffe066'; px[2][9] = '#ffd93d';
    px[3][6] = '#ffd93d'; px[3][9] = '#ffd93d';
    return px;
  };

  const crate = (): Color[][] => {
    const px: Color[][] = Array.from({ length: H }, () => Array(W).fill(null));
    for (let y = 7; y < 13; y++) for (let x = 4; x < 12; x++) px[y][x] = '#c49564';
    for (let x = 4; x < 12; x++) { px[7][x] = '#a07840'; px[12][x] = '#a07840'; }
    for (let y = 7; y < 13; y++) { px[y][4] = '#a07840'; px[y][11] = '#a07840'; }
    px[9][7] = '#a07840'; px[9][8] = '#a07840'; px[10][7] = '#a07840'; px[10][8] = '#a07840';
    return px;
  };

  return [tree(), pine(), flower(), bush(), fountain(), bench(), signpost(), rock(), lamp(), crate()];
}

function uiTiles(): Color[][][] {
  const heart = (): Color[][] => {
    const px: Color[][] = Array.from({ length: H }, () => Array(W).fill(null));
    const pattern = [
      '..xxx.xxx..',
      '.xxxxx.xxxxx.',
      'xxxxxxxxxxxxxx',
      'xxxxxxxxxxxxxx',
      'xxxxxxxxxxxxxx',
      '.xxxxxxxxxxx.',
      '..xxxxxxxxx..',
      '...xxxxxxx...',
      '....xxxxx....',
      '.....xxx.....',
      '......x......',
    ];
    for (let y = 0; y < pattern.length; y++) {
      for (let x = 0; x < pattern[y].length; x++) {
        if (pattern[y][x] === 'x') px[y + 2][x + 2] = '#ff6b6b';
      }
    }
    return px;
  };

  return [heart()];
}

export function getSpriteIndex(
  category: 'character' | 'terrain' | 'building' | 'object' | 'ui',
  index: number,
  frame?: number
): number {
  const base = {
    character: 0,
    terrain: 96,
    building: 103,
    object: 108,
    ui: 118
  }[category];
  if (category === 'character' && frame !== undefined) {
    return base + index * 4 + frame;
  }
  return base + index;
}
