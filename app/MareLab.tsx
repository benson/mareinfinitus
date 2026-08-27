'use client';

import { useEffect, useRef, useState } from 'react';

type StyleMode = 'A' | 'B' | 'C';

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  seed: number;
  kind: 'plankton' | 'bubble' | 'silt';
};

type Palette = {
  sky: string;
  skyLow: string;
  star: string;
  planetDark: string;
  planet: string;
  planetLight: string;
  waterTop: string;
  water: string;
  waterDeep: string;
  foam: string;
  plankton: string;
  bubble: string;
  kelp: string;
  timber: string;
  timberLight: string;
  steel: string;
  lamp: string;
  abyss: string;
};

const PALETTES: Record<StyleMode, Palette> = {
  A: {
    sky: '#080817', skyLow: '#16112d', star: '#ddd7ff',
    planetDark: '#5f241d', planet: '#a44728', planetLight: '#dd7441',
    waterTop: '#4b3a7a', water: '#27204e', waterDeep: '#100f2d',
    foam: '#ded9ff', plankton: '#d39b32', bubble: '#6bb9c5', kelp: '#9a6f20',
    timber: '#2a191c', timberLight: '#67402b', steel: '#39384e', lamp: '#ffb23d', abyss: '#05050f',
  },
  B: {
    sky: '#09091b', skyLow: '#21163a', star: '#eee8ff',
    planetDark: '#652a25', planet: '#a94e31', planetLight: '#ee8650',
    waterTop: '#62518f', water: '#30265f', waterDeep: '#14133b',
    foam: '#f1eaff', plankton: '#e0a83c', bubble: '#73cad1', kelp: '#b78628',
    timber: '#2a1c20', timberLight: '#795038', steel: '#48475d', lamp: '#ffc35a', abyss: '#060612',
  },
  C: {
    sky: '#090c1e', skyLow: '#2a193c', star: '#f8efff',
    planetDark: '#6f3029', planet: '#b85b38', planetLight: '#f29558',
    waterTop: '#745b9f', water: '#392b6c', waterDeep: '#171642',
    foam: '#fff4ff', plankton: '#edb64d', bubble: '#83dce0', kelp: '#c59635',
    timber: '#302127', timberLight: '#8a5b3d', steel: '#55546d', lamp: '#ffd36d', abyss: '#070713',
  },
};

const ART_PIXEL = 3;
const WATERLINE = 0.39;

function hash(n: number) {
  const value = Math.sin(n * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function drawPixelDisc(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  color: string,
) {
  ctx.fillStyle = color;
  for (let y = -radius; y <= radius; y += 1) {
    const half = Math.floor(Math.sqrt(radius * radius - y * y));
    ctx.fillRect(Math.floor(cx - half), Math.floor(cy + y), half * 2 + 1, 1);
  }
}

function drawPerson(ctx: CanvasRenderingContext2D, x: number, y: number, phase: number, color: string) {
  const step = Math.sin(phase) > 0 ? 1 : -1;
  ctx.fillStyle = color;
  ctx.fillRect(Math.floor(x), Math.floor(y - 5), 2, 2);
  ctx.fillRect(Math.floor(x), Math.floor(y - 3), 2, 3);
  ctx.fillRect(Math.floor(x - step), Math.floor(y), 1, 2);
  ctx.fillRect(Math.floor(x + 1 + step), Math.floor(y), 1, 2);
  ctx.fillStyle = '#11111d';
  ctx.fillRect(Math.floor(x), Math.floor(y - 4), 1, 1);
}

function createParticles(width: number, height: number): Particle[] {
  const line = Math.floor(height * WATERLINE);
  const count = Math.min(2600, Math.floor((width * Math.max(1, height - line)) / 105));
  const particles: Particle[] = [];
  for (let i = 0; i < count; i += 1) {
    const seed = hash(i + width * 7 + height * 13);
    const kind = i % 13 === 0 ? 'bubble' : i % 9 === 0 ? 'silt' : 'plankton';
    particles.push({
      x: hash(i * 3.17 + 2) * width,
      y: line + 4 + hash(i * 5.31 + 8) * Math.max(4, height - line - 8),
      vx: 0,
      vy: 0,
      seed,
      kind,
    });
  }
  return particles;
}

function flowAt(x: number, y: number, time: number, width: number, height: number) {
  const line = height * WATERLINE;
  let vx = 0.15 + Math.sin(y * 0.036 + time * 0.42) * 0.055;
  let vy = Math.sin(x * 0.028 + time * 0.31) * 0.035;
  const platformX = width * 0.7;
  const pylons = [platformX - 20, platformX + 8, platformX + 34];
  for (const px of pylons) {
    const py = line + 38;
    const dx = x - px;
    const dy = y - py;
    const d2 = dx * dx + dy * dy + 70;
    const strength = Math.min(0.55, 80 / d2);
    vx += -dy * strength * 0.028;
    vy += dx * strength * 0.028;
  }
  return { vx, vy };
}

function drawPlanet(ctx: CanvasRenderingContext2D, width: number, height: number, palette: Palette) {
  const radius = 88;
  const cx = Math.floor(width * 0.21);
  const cy = Math.floor(height * 0.13);
  drawPixelDisc(ctx, cx, cy, radius, palette.planetDark);
  drawPixelDisc(ctx, cx - 4, cy - 4, radius - 7, palette.planet);
  for (let i = 0; i < 20; i += 1) {
    const angle = hash(i * 7.2) * Math.PI * 2;
    const dist = Math.sqrt(hash(i * 9.7 + 4)) * (radius - 20);
    const r = 2 + Math.floor(hash(i * 4.3) * 8);
    drawPixelDisc(
      ctx,
      cx + Math.cos(angle) * dist,
      cy + Math.sin(angle) * dist,
      r,
      i % 3 === 0 ? palette.planetLight : palette.planetDark,
    );
  }
}

function drawPlatform(ctx: CanvasRenderingContext2D, width: number, line: number, time: number, palette: Palette) {
  const left = Math.floor(width * 0.57);
  const right = width + 4;
  const deck = line - 26;
  ctx.fillStyle = palette.timber;
  ctx.fillRect(left, deck, right - left, 6);
  ctx.fillRect(left + 18, deck - 24, right - left - 28, 24);
  ctx.fillStyle = palette.timberLight;
  ctx.fillRect(left - 3, deck - 2, right - left + 3, 2);
  ctx.fillRect(left + 14, deck - 25, right - left - 20, 2);

  const pylons = [left + 16, left + 44, left + 70];
  for (const x of pylons) {
    ctx.fillStyle = palette.steel;
    ctx.fillRect(x, deck + 4, 7, 82);
    ctx.fillStyle = palette.timberLight;
    ctx.fillRect(x + 1, deck + 5, 2, 80);
    for (let y = deck + 12; y < deck + 80; y += 10) ctx.fillRect(x, y, 7, 1);
  }

  ctx.fillStyle = palette.steel;
  ctx.fillRect(left + 46, deck - 48, 4, 25);
  ctx.fillRect(left + 38, deck - 47, 20, 2);
  ctx.fillRect(left + 45, deck - 54, 6, 5);
  ctx.fillRect(left + 47, deck - 60, 1, 7);
  ctx.fillStyle = palette.lamp;
  ctx.fillRect(left + 47, deck - 61, 1, 1);

  for (let i = 0; i < 6; i += 1) {
    const wx = left + 24 + (i % 4) * 14;
    const wy = deck - 17 + Math.floor(i / 4) * 9;
    ctx.fillStyle = hash(i + Math.floor(time / 4)) > 0.25 ? palette.lamp : palette.timber;
    ctx.fillRect(wx, wy, 4, 4);
  }

  for (let i = 0; i < 7; i += 1) {
    const roam = Math.sin(time * (0.18 + i * 0.011) + i * 4.2) * (7 + (i % 3) * 5);
    drawPerson(ctx, left + 10 + i * 13 + roam, deck - 3, time * 4 + i, i % 2 ? palette.foam : palette.kelp);
  }
}

function drawKelp(ctx: CanvasRenderingContext2D, x: number, baseY: number, length: number, time: number, palette: Palette) {
  ctx.fillStyle = palette.kelp;
  let lastX = x;
  for (let i = 0; i < length; i += 1) {
    const currentX = x + Math.sin(time * 0.65 + i * 0.28 + x) * (i / length) * 6;
    ctx.fillRect(Math.floor(currentX), baseY - i, i % 7 === 0 ? 3 : 1, 1);
    if (i > 0 && Math.abs(currentX - lastX) > 1) {
      ctx.fillRect(Math.floor((currentX + lastX) / 2), baseY - i, 1, 1);
    }
    lastX = currentX;
  }
}

function drawWorld(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  particles: Particle[],
  mode: StyleMode,
) {
  const palette = PALETTES[mode];
  const line = Math.floor(height * WATERLINE);
  const skyGradient = ctx.createLinearGradient(0, 0, 0, line);
  skyGradient.addColorStop(0, palette.sky);
  skyGradient.addColorStop(1, palette.skyLow);
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, width, line);

  for (let i = 0; i < Math.floor(width * line * 0.006); i += 1) {
    const x = Math.floor(hash(i * 2.7 + width) * width);
    const y = Math.floor(hash(i * 5.9 + height) * line);
    const twinkle = hash(i * 7 + Math.floor(time * 1.5));
    ctx.fillStyle = twinkle > 0.88 ? palette.foam : palette.star;
    ctx.fillRect(x, y, twinkle > 0.96 && mode !== 'A' ? 2 : 1, 1);
  }

  drawPlanet(ctx, width, height, palette);

  const waterGradient = ctx.createLinearGradient(0, line, 0, height);
  waterGradient.addColorStop(0, palette.waterTop);
  waterGradient.addColorStop(0.35, palette.water);
  waterGradient.addColorStop(1, palette.abyss);
  ctx.fillStyle = waterGradient;
  ctx.fillRect(0, line, width, height - line);

  for (let y = line + 10; y < height; y += 12) {
    ctx.fillStyle = y < line + 80 ? palette.water : palette.waterDeep;
    const offset = Math.floor(Math.sin(time * 0.22 + y * 0.08) * 8);
    for (let x = offset; x < width; x += 24) ctx.fillRect(x, y, 12, 1);
  }

  ctx.fillStyle = palette.foam;
  for (let x = 0; x < width; x += 1) {
    const wave = Math.floor(Math.sin(x * 0.055 + time * 1.15) * 2 + Math.sin(x * 0.019 - time * 0.7) * 2);
    if ((x + Math.floor(time * 6)) % 5 !== 0) ctx.fillRect(x, line + wave, 1, 1);
  }

  for (const particle of particles) {
    const flow = flowAt(particle.x, particle.y, time, width, height);
    if (particle.kind === 'bubble') {
      particle.vx = particle.vx * 0.92 + flow.vx * 0.35;
      particle.vy = particle.vy * 0.9 - 0.06;
    } else if (particle.kind === 'silt') {
      particle.vx = particle.vx * 0.9 + flow.vx * 0.18;
      particle.vy = particle.vy * 0.92 + 0.018;
    } else {
      particle.vx = particle.vx * 0.9 + flow.vx * 0.24;
      particle.vy = particle.vy * 0.9 + flow.vy * 0.24;
    }
    particle.x += particle.vx;
    particle.y += particle.vy;
    if (particle.x > width + 2) particle.x = -2;
    if (particle.x < -3) particle.x = width + 2;
    if (particle.y < line + 3) particle.y = height - hash(particle.seed + time) * 30 - 4;
    if (particle.y > height - 1) particle.y = line + 5;
    ctx.fillStyle = particle.kind === 'bubble' ? palette.bubble : particle.kind === 'silt' ? palette.timberLight : palette.plankton;
    ctx.globalAlpha = mode === 'A' ? 0.76 : 0.86;
    ctx.fillRect(Math.floor(particle.x), Math.floor(particle.y), particle.kind === 'bubble' && mode === 'C' ? 2 : 1, 1);
  }
  ctx.globalAlpha = 1;

  for (let x = 15; x < width; x += 42) {
    drawKelp(ctx, x, height - 2, 18 + Math.floor(hash(x) * 30), time + x, palette);
  }

  drawPlatform(ctx, width, line, time, palette);

  const raftCycle = width + 90;
  const raftX = ((time * 5.5) % raftCycle) - 45;
  const raftY = line - 5 + Math.sin(time * 1.25 + raftX * 0.03) * 2;
  ctx.fillStyle = palette.timberLight;
  ctx.fillRect(Math.floor(raftX), Math.floor(raftY), 24, 3);
  ctx.fillStyle = palette.timber;
  ctx.fillRect(Math.floor(raftX + 3), Math.floor(raftY + 3), 18, 1);
  drawPerson(ctx, raftX + 7, raftY, time * 2.4, palette.foam);
  drawPerson(ctx, raftX + 15, raftY, time * 2.1 + 2, palette.kelp);
  ctx.fillStyle = palette.bubble;
  for (let i = 0; i < 9; i += 1) ctx.fillRect(Math.floor(raftX - i * 2), Math.floor(raftY + 5 + Math.sin(i + time) * 2), 1, 1);

  const carpetCycle = width + 130;
  const carpetX = width - ((time * 9) % carpetCycle) + 40;
  const carpetY = line - 33 + Math.sin(time * 0.9) * 6;
  ctx.fillStyle = palette.planetLight;
  ctx.fillRect(Math.floor(carpetX), Math.floor(carpetY), 17, 2);
  ctx.fillStyle = palette.kelp;
  ctx.fillRect(Math.floor(carpetX + 2), Math.floor(carpetY + 1), 13, 1);
  drawPerson(ctx, carpetX + 8, carpetY, time * 3, palette.foam);
  ctx.fillStyle = palette.plankton;
  for (let i = 0; i < 7; i += 1) ctx.fillRect(Math.floor(carpetX + 18 + i * 2), Math.floor(carpetY + 1 + Math.sin(i + time) * 2), 1, 1);

  const archX = Math.floor(width * 0.13);
  ctx.strokeStyle = palette.steel;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(archX, line + 2, 17, Math.PI, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 1;
}

export default function MareLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<StyleMode>('B');
  const modeRef = useRef<StyleMode>('B');

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    let frame = 0;
    let particles: Particle[] = [];
    let width = 0;
    let height = 0;
    const started = performance.now();

    const resize = () => {
      width = Math.max(1, Math.ceil(window.innerWidth / ART_PIXEL));
      height = Math.max(1, Math.ceil(window.innerHeight / ART_PIXEL));
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${width * ART_PIXEL}px`;
      canvas.style.height = `${height * ART_PIXEL}px`;
      ctx.imageSmoothingEnabled = false;
      particles = createParticles(width, height);
    };
    resize();

    const render = (now: number) => {
      drawWorld(ctx, width, height, (now - started) / 1000, particles, modeRef.current);
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);

    const onKey = (event: KeyboardEvent) => {
      const key = event.key.toUpperCase();
      if (key === 'A' || key === 'B' || key === 'C') setMode(key);
      if (key === 'F') document.documentElement.requestFullscreen?.();
    };
    window.addEventListener('resize', resize);
    window.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <main className={`mare-shell mode-${mode.toLowerCase()}`}>
      <canvas ref={canvasRef} className="mare-canvas" aria-label="A living pixel simulation of the ocean moon Mare Infinitus" />
      <header className="lab-header">
        <p>MARE INFINITUS</p>
        <span>material study / live</span>
      </header>
      <section className="style-switcher" aria-label="Visual style">
        <p>VISUAL DENSITY</p>
        <div>
          {(['A', 'B', 'C'] as StyleMode[]).map((item) => (
            <button key={item} className={mode === item ? 'active' : ''} onClick={() => setMode(item)}>
              <span>{item}</span>
              {item === 'A' ? 'Austere' : item === 'B' ? 'Balanced' : 'Luminous'}
            </button>
          ))}
        </div>
        <small>A/B/C to compare · F for fullscreen</small>
      </section>
    </main>
  );
}
