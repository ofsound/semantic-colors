import { clampRgb, converter, displayable, formatCss, parse } from 'culori';
import type { OklchColor } from './schema';

const toOklch = converter('oklch');
const toRgb = converter('rgb');

export function cloneColor(color: OklchColor): OklchColor {
  return { ...color };
}

export function normalizeHue(hue: number): number {
  const value = hue % 360;
  return value < 0 ? value + 360 : value;
}

export function sanitizeColor(color: OklchColor): OklchColor {
  return {
    l: clamp(color.l, 0, 1),
    c: Math.max(0, color.c),
    h: normalizeHue(color.h),
    alpha: color.alpha ?? 1
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function parseColor(input: string): OklchColor | null {
  const parsed = parse(input);
  if (!parsed) {
    return null;
  }
  const color = toOklch(parsed);
  if (!color || color.l === undefined || color.c === undefined || color.h === undefined) {
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
  return formatCss(converted) ?? `oklch(${(normalized.l * 100).toFixed(2)}% ${normalized.c.toFixed(4)} ${normalized.h.toFixed(2)})`;
}

export function toRgbChannels(color: OklchColor): [number, number, number] {
  const rgb = toRgb(color);
  if (!rgb || rgb.r === undefined || rgb.g === undefined || rgb.b === undefined) {
    return [0, 0, 0];
  }
  return [
    Math.round(clamp(rgb.r, 0, 1) * 255),
    Math.round(clamp(rgb.g, 0, 1) * 255),
    Math.round(clamp(rgb.b, 0, 1) * 255)
  ];
}

export function clampToDisplayable(color: OklchColor, maxChroma?: number | null): OklchColor {
  let working = sanitizeColor(color);
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
  if (!backToOklch || backToOklch.l === undefined || backToOklch.c === undefined || backToOklch.h === undefined) {
    return sanitizeColor(best);
  }

  return sanitizeColor({
    l: backToOklch.l,
    c: backToOklch.c,
    h: backToOklch.h ?? working.h,
    alpha: backToOklch.alpha ?? working.alpha
  });
}
