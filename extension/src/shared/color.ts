import type { OklchColor } from './types';

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
