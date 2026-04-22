import { clampRgb, converter, displayable, formatCss, parse } from 'culori';
import type { OklchColor } from './schema';

const toOklch = converter('oklch');
const toRgb = converter('rgb');

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

export function cloneColor(color: OklchColor): OklchColor {
  return { ...color };
}

export function normalizeHue(hue: number): number {
  const value = hue % 360;
  return value < 0 ? value + 360 : value;
}

function sanitizeColor(color: OklchColor): OklchColor {
  return {
    l: clamp(color.l, 0, 1),
    c: Math.max(0, color.c),
    h: normalizeHue(color.h),
    alpha: color.alpha ?? 1
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function parseColor(input: string): OklchColor | null {
  const parsed = parse(input);
  if (!parsed) {
    return null;
  }
  const color = toOklch(parsed);
  if (!color || color.l === undefined || color.c === undefined) {
    return null;
  }

  return sanitizeColor({
    l: color.l,
    c: color.c,
    h: color.h ?? 0,
    alpha: color.alpha ?? 1
  });
}

export function toCssColor(color: OklchColor): string {
  const normalized = sanitizeColor(color);
  const converted = toOklch(normalized);
  return (
    formatCss(converted) ??
    `oklch(${(normalized.l * 100).toFixed(2)}% ${normalized.c.toFixed(4)} ${normalized.h.toFixed(2)})`
  );
}

export function toRgbChannels(color: OklchColor): [number, number, number] {
  const normalized = sanitizeColor(color);
  const rgb = toRgb({ ...normalized, mode: 'oklch' });
  if (!rgb || rgb.r === undefined || rgb.g === undefined || rgb.b === undefined) {
    return [0, 0, 0];
  }
  return [
    Math.round(clamp(rgb.r, 0, 1) * 255),
    Math.round(clamp(rgb.g, 0, 1) * 255),
    Math.round(clamp(rgb.b, 0, 1) * 255)
  ];
}

export function toRgbColor(color: OklchColor): RgbColor {
  const [r, g, b] = toRgbChannels(color);
  return { r, g, b };
}

export function rgbToHex(color: RgbColor): string {
  return `#${[color.r, color.g, color.b]
    .map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;
}

export function toHexColor(color: OklchColor): string {
  return rgbToHex(toRgbColor(color));
}

export function rgbToDisplayString(color: RgbColor): string {
  return `${color.r}, ${color.g}, ${color.b}`;
}

export function parseRgbInput(input: string): RgbColor | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  const match = trimmed.match(/^rgb\s*\((.*)\)$/i);
  const content = match ? match[1] : trimmed;
  const parts = content.split(/[\s,]+/).filter(Boolean);

  if (parts.length !== 3) {
    return null;
  }

  const channels = parts.map((part) => Number(part));
  if (channels.some((channel) => !Number.isFinite(channel))) {
    return null;
  }
  if (channels.some((channel) => channel < 0 || channel > 255)) {
    return null;
  }

  return {
    r: Math.round(channels[0]),
    g: Math.round(channels[1]),
    b: Math.round(channels[2])
  };
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
    if (hue < 0) {
      hue += 360;
    }
  }

  return {
    h: hue,
    s: max === 0 ? 0 : (delta / max) * 100,
    v: max * 100
  };
}

export function hsvToRgb(color: HsvColor): RgbColor {
  const saturation = clamp(color.s, 0, 100) / 100;
  const value = clamp(color.v, 0, 100) / 100;
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

export function pickerPointToHsv(width: number, height: number, x: number, y: number): HsvColor {
  const clampedWidth = Math.max(width, 1);
  const clampedHeight = Math.max(height, 1);
  const clampedX = clamp(x, 0, clampedWidth);
  const clampedY = clamp(y, 0, clampedHeight);
  const yRatio = clampedY / clampedHeight;
  const inTopHalf = yRatio <= 0.5;

  return {
    h: (clampedX / clampedWidth) * 360,
    s: inTopHalf ? 100 : 100 - ((yRatio - 0.5) / 0.5) * 100,
    v: inTopHalf ? (yRatio / 0.5) * 100 : 100
  };
}

export function pickerPositionFromHsv(color: HsvColor): { xPercent: string; yPercent: string } {
  return {
    xPercent: `${(normalizeHue(color.h) / 360) * 100}%`,
    yPercent:
      color.v >= 99.5
        ? `${50 + ((100 - clamp(color.s, 0, 100)) / 100) * 50}%`
        : `${(clamp(color.v, 0, 100) / 100) * 50}%`
  };
}

export function clampToDisplayable(color: OklchColor, maxChroma?: number | null): OklchColor {
  const working = sanitizeColor(color);
  if (maxChroma !== undefined && maxChroma !== null) {
    working.c = Math.min(working.c, maxChroma);
  }

  const candidate = toOklch(working);
  if (candidate && displayable(candidate)) {
    return working;
  }

  let low = 0;
  let high = working.c;
  let best = { ...working, c: 0 };

  for (let index = 0; index < 18; index += 1) {
    const mid = (low + high) / 2;
    const probe = { ...working, c: mid };
    const converted = toOklch(probe);

    if (converted && displayable(converted)) {
      best = probe;
      low = mid;
    } else {
      high = mid;
    }
  }

  const clamped = clampRgb(best);
  const backToOklch = toOklch(clamped);
  if (!backToOklch || backToOklch.l === undefined || backToOklch.c === undefined) {
    return sanitizeColor(best);
  }

  return sanitizeColor({
    l: backToOklch.l,
    c: backToOklch.c,
    h: backToOklch.h ?? working.h,
    alpha: backToOklch.alpha ?? working.alpha
  });
}
