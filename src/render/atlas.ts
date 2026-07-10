const W = 16;
const H = 16;

type Color = string | null;

function hex(r: number, g: number, b: number): string {
  return `rgb(${r},${g},${b})`;
}

interface SpriteDef {
  pixels: Color[][];
  animFrames?: Color[][][];
}

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
    { hair: '#5c3a1e', skin: '#f5c6a0', shirt: '#e84393', pants: '#2d3436', shoes: '#6c5ce7' },
    { hair: '#2d3436', skin: '#fad390', shirt: '#0984e3', pants: '#2d3436', shoes: '#e17055' },
    { hair: '#6c5ce7', skin: '#f5c6a0', shirt: '#00b894', pants: '#2d3436', shoes: '#fdcb6e' },
    { hair: '#d63031', skin: '#fad390', shirt: '#e17055', pants: '#2d3436', shoes: '#636e72' },
    { hair: '#0984e3', skin: '#f5c6a0', shirt: '#a29bfe', pants: '#2d3436', shoes: '#fab1a0' },
    { hair: '#e17055', skin: '#fad390', shirt: '#fdcb6e', pants: '#2d3436', shoes: '#74b9ff' },
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
    // down
    setRow(px, 2 + bob, 6, 4, c.hair);
    setRow(px, 3 + bob, 6, 4, c.hair);
    setRow(px, 4 + bob, 6, 4, c.skin);
    px[4 + bob][7] = '#2d3436'; px[4 + bob][8] = '#2d3436';
    setRow(px, 5 + bob, 6, 4, c.skin);
    setRow(px, 6 + bob, 5, 6, c.shirt);
    setRow(px, 7 + bob, 5, 6, c.shirt);
    setRow(px, 8 + bob, 5, 6, c.shirt);
    if (legL) { setRow(px, 9 + bob, 6, 2, c.pants); setRow(px, 10 + bob, 6, 2, c.pants); }
    if (legR) { setRow(px, 9 + bob, 8, 2, c.pants); setRow(px, 10 + bob, 8, 2, c.pants); }
    px[11 + bob][6] = c.shoes; px[11 + bob][7] = c.shoes;
    px[11 + bob][8] = c.shoes; px[11 + bob][9] = c.shoes;
  } else if (dir === 1) {
    // left
    setRow(px, 2 + bob, 6, 4, c.hair);
    setRow(px, 3 + bob, 6, 4, c.hair);
    setRow(px, 4 + bob, 6, 4, c.skin);
    px[4 + bob][7] = '#2d3436';
    setRow(px, 5 + bob, 6, 4, c.skin);
    setRow(px, 6 + bob, 5, 6, c.shirt);
    setRow(px, 7 + bob, 5, 6, c.shirt);
    setRow(px, 8 + bob, 5, 6, c.shirt);
    if (legL) { setRow(px, 9 + bob, 6, 2, c.pants); setRow(px, 10 + bob, 6, 2, c.pants); }
    if (legR) { setRow(px, 9 + bob, 8, 2, c.pants); setRow(px, 10 + bob, 8, 2, c.pants); }
    px[11 + bob][6] = c.shoes; px[11 + bob][7] = c.shoes;
    px[11 + bob][8] = c.shoes; px[11 + bob][9] = c.shoes;
  } else if (dir === 2) {
    // right
    setRow(px, 2 + bob, 6, 4, c.hair);
    setRow(px, 3 + bob, 6, 4, c.hair);
    setRow(px, 4 + bob, 6, 4, c.skin);
    px[4 + bob][9] = '#2d3436';
    setRow(px, 5 + bob, 6, 4, c.skin);
    setRow(px, 6 + bob, 5, 6, c.shirt);
    setRow(px, 7 + bob, 5, 6, c.shirt);
    setRow(px, 8 + bob, 5, 6, c.shirt);
    if (legL) { setRow(px, 9 + bob, 6, 2, c.pants); setRow(px, 10 + bob, 6, 2, c.pants); }
    if (legR) { setRow(px, 9 + bob, 8, 2, c.pants); setRow(px, 10 + bob, 8, 2, c.pants); }
    px[11 + bob][6] = c.shoes; px[11 + bob][7] = c.shoes;
    px[11 + bob][8] = c.shoes; px[11 + bob][9] = c.shoes;
  } else {
    // up
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
    const px: Color[][] = Array.from({ length: H }, () => Array(W).fill('#4a7c3f'));
    for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) px[y][x] = '#3d6b35';
    px[3][5] = '#5a9c4f'; px[7][11] = '#5a9c4f'; px[12][3] = '#5a9c4f';
    return px;
  };

  const dirt = (): Color[][] => {
    const px: Color[][] = Array.from({ length: H }, () => Array(W).fill('#8b6914'));
    for (let y = 0; y < H; y += 3) for (let x = 0; x < W; x += 3) px[y][x] = '#7a5c10';
    px[2][6] = '#9a7a20'; px[8][12] = '#9a7a20';
    return px;
  };

  const water = (): Color[][] => {
    const px: Color[][] = Array.from({ length: H }, () => Array(W).fill('#2980b9'));
    for (let y = 0; y < H; y += 4) for (let x = 0; x < W; x++) px[y][x] = '#3498db';
    px[1][3] = '#5dade2'; px[5][10] = '#5dade2'; px[9][7] = '#5dade2';
    return px;
  };

  const stone = (): Color[][] => {
    const px: Color[][] = Array.from({ length: H }, () => Array(W).fill('#636e72'));
    for (let y = 0; y < H; y += 4) for (let x = 0; x < W; x += 4) px[y][x] = '#555e62';
    for (let x = 0; x < W; x += 4) px[2][x] = '#6d787c';
    return px;
  };

  const sand = (): Color[][] => {
    const px: Color[][] = Array.from({ length: H }, () => Array(W).fill('#f5deb3'));
    for (let y = 0; y < H; y += 3) for (let x = 0; x < W; x += 3) px[y][x] = '#e8d5a0';
    px[5][8] = '#f0d89f';
    return px;
  };

  const darkGrass = (): Color[][] => {
    const px: Color[][] = Array.from({ length: H }, () => Array(W).fill('#2d5a1e'));
    for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) px[y][x] = '#235015';
    px[4][7] = '#3a6b2a'; px[10][3] = '#3a6b2a';
    return px;
  };

  return [grass(), dirt(), water(), stone(), sand(), darkGrass()];
}

function buildingTiles(): Color[][][] {
  const wall = (): Color[][] => {
    const px: Color[][] = Array.from({ length: H }, () => Array(W).fill('#c0392b'));
    for (let x = 0; x < W; x += 4) { px[0][x] = '#a93226'; px[1][x] = '#a93226'; }
    for (let y = 0; y < H; y += 4) { px[y][0] = '#a93226'; px[y][1] = '#a93226'; }
    return px;
  };

  const roof = (): Color[][] => {
    const px: Color[][] = Array.from({ length: H }, () => Array(W).fill('#8e44ad'));
    for (let x = 0; x < W; x += 2) px[0][x] = '#6c3483';
    for (let y = 0; y < H; y += 3) for (let x = 0; x < W; x++) px[y][x] = '#7d3c98';
    return px;
  };

  const door = (): Color[][] => {
    const px: Color[][] = Array.from({ length: H }, () => Array(W).fill('#c0392b'));
    px[6][6] = '#5a3e1b'; px[6][7] = '#5a3e1b'; px[6][8] = '#5a3e1b'; px[6][9] = '#5a3e1b';
    for (let y = 7; y < 14; y++) { px[y][6] = '#5a3e1b'; px[y][7] = '#6b4a25'; px[y][8] = '#6b4a25'; px[y][9] = '#5a3e1b'; }
    px[10][8] = '#f0c040';
    return px;
  };

  const window = (): Color[][] => {
    const px: Color[][] = Array.from({ length: H }, () => Array(W).fill('#c0392b'));
    for (let y = 5; y < 10; y++) for (let x = 5; x < 10; x++) px[y][x] = '#74b9ff';
    px[5][5] = '#5a3e1b'; px[5][9] = '#5a3e1b'; px[9][5] = '#5a3e1b'; px[9][9] = '#5a3e1b';
    px[7][5] = '#5a3e1b'; px[7][9] = '#5a3e1b'; px[5][7] = '#5a3e1b'; px[9][7] = '#5a3e1b';
    return px;
  };

  const woodFloor = (): Color[][] => {
    const px: Color[][] = Array.from({ length: H }, () => Array(W).fill('#a0522d'));
    for (let y = 0; y < H; y += 4) for (let x = 0; x < W; x++) px[y][x] = '#8b4513';
    for (let x = 0; x < W; x += 8) for (let y = 0; y < H; y++) px[y][x] = '#8b4513';
    return px;
  };

  return [wall(), roof(), door(), window(), woodFloor()];
}

function objectTiles(): Color[][][] {
  const tree = (): Color[][] => {
    const px: Color[][] = Array.from({ length: H }, () => Array(W).fill(null));
    for (let y = 1; y < 5; y++) for (let x = 4; x < 12; x++) px[y][x] = '#27ae60';
    for (let y = 0; y < 3; y++) for (let x = 5; x < 11; x++) px[y][x] = '#2ecc71';
    px[1][6] = '#1abc9c'; px[2][9] = '#1abc9c';
    for (let y = 5; y < 14; y++) { px[y][7] = '#6d4c2a'; px[y][8] = '#5a3e1b'; }
    return px;
  };

  const flower = (): Color[][] => {
    const px: Color[][] = Array.from({ length: H }, () => Array(W).fill(null));
    px[8][7] = '#27ae60'; px[9][7] = '#27ae60'; px[10][7] = '#27ae60';
    px[6][7] = '#e74c3c'; px[6][8] = '#e74c3c'; px[7][7] = '#f39c12';
    px[5][7] = '#e74c3c';
    return px;
  };

  const fountain = (): Color[][] => {
    const px: Color[][] = Array.from({ length: H }, () => Array(W).fill(null));
    for (let y = 4; y < 12; y++) for (let x = 3; x < 13; x++) px[y][x] = '#95a5a6';
    for (let y = 5; y < 11; y++) for (let x = 4; x < 12; x++) px[y][x] = '#74b9ff';
    for (let y = 6; y < 10; y++) for (let x = 5; x < 11; x++) px[y][x] = '#81ecec';
    px[7][7] = '#dfe6e9'; px[7][8] = '#dfe6e9';
    px[3][7] = '#95a5a6'; px[3][8] = '#95a5a6';
    px[2][7] = '#74b9ff'; px[2][8] = '#74b9ff';
    return px;
  };

  const bench = (): Color[][] => {
    const px: Color[][] = Array.from({ length: H }, () => Array(W).fill(null));
    for (let x = 3; x < 13; x++) px[7][x] = '#6d4c2a';
    for (let x = 3; x < 13; x++) px[8][x] = '#5a3e1b';
    px[9][4] = '#5a3e1b'; px[9][5] = '#5a3e1b'; px[9][10] = '#5a3e1b'; px[9][11] = '#5a3e1b';
    px[10][4] = '#5a3e1b'; px[10][5] = '#5a3e1b'; px[10][10] = '#5a3e1b'; px[10][11] = '#5a3e1b';
    return px;
  };

  const signpost = (): Color[][] => {
    const px: Color[][] = Array.from({ length: H }, () => Array(W).fill(null));
    px[7][7] = '#5a3e1b'; px[8][7] = '#5a3e1b'; px[9][7] = '#5a3e1b'; px[10][7] = '#5a3e1b'; px[11][7] = '#5a3e1b';
    for (let y = 3; y < 7; y++) for (let x = 4; x < 12; x++) px[y][x] = '#f0c040';
    px[4][5] = '#6d4c2a'; px[4][9] = '#6d4c2a';
    return px;
  };

  return [tree(), flower(), fountain(), bench(), signpost()];
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
        if (pattern[y][x] === 'x') px[y + 2][x + 2] = '#e74c3c';
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
    terrain: 24,
    building: 30,
    object: 35,
    ui: 40
  }[category];
  if (category === 'character' && frame !== undefined) {
    return base + index * 4 + frame;
  }
  return base + index;
}
