import type { OklchColor } from './types';

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface HsvColor {
  h: number;
  s: number;
  v: number;
}

// --- OKLCH <-> sRGB conversions (D65, linear-sRGB via Oklab). --------------

function srgbToLinear(value: number): number {
  const v = value / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(value: number): number {
  const v = value <= 0.0031308 ? value * 12.92 : 1.055 * Math.pow(value, 1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, Math.round(v * 255)));
}

function oklabToLinearSrgb(L: number, a: number, b: number): [number, number, number] {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
  ];
}

function linearSrgbToOklab(r: number, g: number, b: number): [number, number, number] {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  ];
}

export function oklchToRgb(color: OklchColor): { r: number; g: number; b: number; alpha: number } {
  const hueRad = (color.h * Math.PI) / 180;
  const a = color.c * Math.cos(hueRad);
  const b = color.c * Math.sin(hueRad);
  const [lr, lg, lb] = oklabToLinearSrgb(color.l, a, b);
  return {
    r: linearToSrgb(lr),
    g: linearToSrgb(lg),
    b: linearToSrgb(lb),
    alpha: color.alpha ?? 1
  };
}

export function rgbToOklch(r: number, g: number, b: number, alpha = 1): OklchColor {
  const [L, a, bLab] = linearSrgbToOklab(srgbToLinear(r), srgbToLinear(g), srgbToLinear(b));
  const c = Math.sqrt(a * a + bLab * bLab);
  let h = (Math.atan2(bLab, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { l: L, c, h, alpha };
}

export function normalizeHue(hue: number): number {
  const value = hue % 360;
  return value < 0 ? value + 360 : value;
}

export function rgbToHex(color: RgbColor): string {
  return `#${[color.r, color.g, color.b]
    .map((channel) =>
      Math.max(0, Math.min(255, Math.round(channel)))
        .toString(16)
        .padStart(2, '0')
    )
    .join('')
    .toUpperCase()}`;
}

export function oklchToHex(color: OklchColor): string {
  const { r, g, b } = oklchToRgb(color);
  return rgbToHex({ r, g, b });
}

export function rgbToDisplayString(color: RgbColor): string {
  return `${color.r}, ${color.g}, ${color.b}`;
}

export function rgbToHsv(color: RgbColor): HsvColor {
  const rNormalized = color.r / 255;
  const gNormalized = color.g / 255;
  const bNormalized = color.b / 255;

  const max = Math.max(rNormalized, gNormalized, bNormalized);
  const min = Math.min(rNormalized, gNormalized, bNormalized);
  const delta = max - min;

  let hue = 0;
  if (delta !== 0) {
    if (max === rNormalized) {
      hue = ((gNormalized - bNormalized) / delta) % 6;
    } else if (max === gNormalized) {
      hue = (bNormalized - rNormalized) / delta + 2;
    } else {
      hue = (rNormalized - gNormalized) / delta + 4;
    }
    hue *= 60;
    if (hue < 0) hue += 360;
  }

  return {
    h: hue,
    s: max === 0 ? 0 : (delta / max) * 100,
    v: max * 100
  };
}

export function hsvToRgb(color: HsvColor): RgbColor {
  const saturation = Math.max(0, Math.min(100, color.s)) / 100;
  const value = Math.max(0, Math.min(100, color.v)) / 100;
  const hue = normalizeHue(color.h);

  const chroma = value * saturation;
  const secondary = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const match = value - chroma;

  let redPrime: number;
  let greenPrime: number;
  let bluePrime: number;

  if (hue < 60) {
    [redPrime, greenPrime, bluePrime] = [chroma, secondary, 0];
  } else if (hue < 120) {
    [redPrime, greenPrime, bluePrime] = [secondary, chroma, 0];
  } else if (hue < 180) {
    [redPrime, greenPrime, bluePrime] = [0, chroma, secondary];
  } else if (hue < 240) {
    [redPrime, greenPrime, bluePrime] = [0, secondary, chroma];
  } else if (hue < 300) {
    [redPrime, greenPrime, bluePrime] = [secondary, 0, chroma];
  } else {
    [redPrime, greenPrime, bluePrime] = [chroma, 0, secondary];
  }

  return {
    r: Math.round((redPrime + match) * 255),
    g: Math.round((greenPrime + match) * 255),
    b: Math.round((bluePrime + match) * 255)
  };
}

export function parseRgbInput(input: string): RgbColor | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^rgb\s*\((.*)\)$/i);
  const content = match ? match[1] : trimmed;
  const parts = content.split(/[\s,]+/).filter(Boolean);

  if (parts.length !== 3) return null;

  const channels = parts.map((part) => Number(part));
  if (channels.some((channel) => !Number.isFinite(channel))) return null;
  if (channels.some((channel) => channel < 0 || channel > 255)) return null;

  return {
    r: Math.round(channels[0]),
    g: Math.round(channels[1]),
    b: Math.round(channels[2])
  };
}

export function normalizeHexInput(input: string): string | null {
  const trimmed = input.trim();
  const withoutHash = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed;
  const isShortHex = /^[0-9a-fA-F]{3}$/.test(withoutHash);
  const isLongHex = /^[0-9a-fA-F]{6}$/.test(withoutHash);

  if (!isShortHex && !isLongHex) {
    return null;
  }

  const fullHex = isShortHex
    ? withoutHash
        .split('')
        .map((character) => character + character)
        .join('')
    : withoutHash;

  return `#${fullHex.toUpperCase()}`;
}

export function hexToRgb(input: string): RgbColor | null {
  const normalized = normalizeHexInput(input);
  if (!normalized) return null;

  const value = Number.parseInt(normalized.slice(1), 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255
  };
}

export function pickerPointToHsv(width: number, height: number, x: number, y: number): HsvColor {
  const clampedWidth = Math.max(width, 1);
  const clampedHeight = Math.max(height, 1);
  const clampedX = Math.max(0, Math.min(clampedWidth, x));
  const clampedY = Math.max(0, Math.min(clampedHeight, y));
  const yRatio = clampedY / clampedHeight;
  const inTopHalf = yRatio <= 0.5;

  return {
    h: (clampedX / clampedWidth) * 360,
    s: inTopHalf ? 100 : 100 - ((yRatio - 0.5) / 0.5) * 100,
    v: inTopHalf ? (yRatio / 0.5) * 100 : 100
  };
}

export function pickerPositionFromHsv(color: HsvColor): { xPercent: string; yPercent: string } {
  const hue = normalizeHue(color.h);
  const saturation = Math.max(0, Math.min(100, color.s));
  const value = Math.max(0, Math.min(100, color.v));

  return {
    xPercent: `${(hue / 360) * 100}%`,
    yPercent: value >= 99.5 ? `${50 + ((100 - saturation) / 100) * 50}%` : `${(value / 100) * 50}%`
  };
}

export function oklchToCss(color: OklchColor): string {
  const { r, g, b, alpha } = oklchToRgb(color);
  if (alpha < 1) {
    return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
  }
  return `rgb(${r}, ${g}, ${b})`;
}

// --- Parse any CSS color string into sRGB tuple ---------------------------

let probeContext: CanvasRenderingContext2D | null = null;

function getProbeContext(): CanvasRenderingContext2D | null {
  if (probeContext) return probeContext;
  if (typeof document === 'undefined') return null;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    probeContext = canvas.getContext('2d', { willReadFrequently: true });
    return probeContext;
  } catch {
    return null;
  }
}

export interface ParsedColor {
  r: number;
  g: number;
  b: number;
  alpha: number;
}

export function parseCssColor(input: string | null | undefined): ParsedColor | null {
  if (!input) return null;
  const text = input.trim();
  if (!text || text === 'none' || text === 'transparent') return null;

  const ctx = getProbeContext();
  if (!ctx) return null;

  ctx.clearRect(0, 0, 1, 1);
  try {
    ctx.fillStyle = '#000';
    ctx.fillStyle = text;
  } catch {
    return null;
  }

  ctx.fillRect(0, 0, 1, 1);
  const data = ctx.getImageData(0, 0, 1, 1).data;
  const alpha = data[3] / 255;
  if (alpha === 0) return null;
  return { r: data[0], g: data[1], b: data[2], alpha };
}

// --- APCA contrast --------------------------------------------------------
// Minimal APCA (Accessible Perceptual Contrast Algorithm) implementation.
// Matches apca-w3 outputs within display precision for sRGB inputs.

const normBG = 0.56;
const normTXT = 0.57;
const revTXT = 0.62;
const revBG = 0.65;
const blkThrs = 0.022;
const blkClmp = 1.414;
const scaleBoW = 1.14;
const scaleWoB = 1.14;
const loBoWoffset = 0.027;
const loWoBoffset = 0.027;
const deltaYmin = 0.0005;

function sRGBtoY(rgb: { r: number; g: number; b: number }): number {
  const r = (rgb.r / 255) ** 2.4;
  const g = (rgb.g / 255) ** 2.4;
  const b = (rgb.b / 255) ** 2.4;
  return 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
}

export function apcaContrast(foreground: ParsedColor, background: ParsedColor): number {
  let txtY = sRGBtoY(foreground);
  let bgY = sRGBtoY(background);

  if (Math.abs(bgY - txtY) < deltaYmin) return 0;

  if (txtY <= blkThrs) txtY += (blkThrs - txtY) ** blkClmp;
  if (bgY <= blkThrs) bgY += (blkThrs - bgY) ** blkClmp;

  let outputContrast: number;
  if (bgY > txtY) {
    const SAPC = (bgY ** normBG - txtY ** normTXT) * scaleBoW;
    outputContrast = SAPC < loBoWoffset ? 0 : SAPC - loBoWoffset;
  } else {
    const SAPC = (bgY ** revBG - txtY ** revTXT) * scaleWoB;
    outputContrast = SAPC > -loWoBoffset ? 0 : SAPC + loWoBoffset;
  }
  return outputContrast * 100;
}

export function apcaSeverity(lc: number): 'ok' | 'warn' | 'fail' {
  const abs = Math.abs(lc);
  if (abs >= 75) return 'ok';
  if (abs >= 60) return 'ok';
  if (abs >= 45) return 'warn';
  return 'fail';
}

export function formatOklch(color: OklchColor): string {
  const l = (color.l * 100).toFixed(2);
  const c = color.c.toFixed(4);
  const h = color.h.toFixed(2);
  const alpha = color.alpha !== undefined && color.alpha < 1 ? ` / ${color.alpha.toFixed(2)}` : '';
  return `oklch(${l}% ${c} ${h}${alpha})`;
}
