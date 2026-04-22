const FINE_ADJUSTMENT_MULTIPLIER = 0.2;

interface DraggedSliderValueOptions {
  value: number;
  deltaPixels: number;
  trackWidth: number;
  min: number;
  max: number;
  step: number;
  fineAdjustment: boolean;
}

interface PointerSliderValueOptions {
  clientX: number;
  trackLeft: number;
  trackWidth: number;
  min: number;
  max: number;
  step: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getStepPrecision(step: number): number {
  const normalizedStep = Math.abs(step);
  const stepText = normalizedStep.toString();

  if (stepText.includes('e-')) {
    const [, exponent = '0'] = stepText.split('e-');
    return Number(exponent);
  }

  const [, decimals = ''] = stepText.split('.');
  return decimals.length;
}

function snapToStep(value: number, min: number, step: number): number {
  if (step <= 0) {
    return value;
  }

  const precision = getStepPrecision(step);
  const snapped = Math.round((value - min) / step) * step + min;
  return Number(snapped.toFixed(precision));
}

export function getBoundedSteppedValue(
  value: number,
  min: number,
  max: number,
  step: number
): number {
  return clamp(snapToStep(value, min, step), min, max);
}

export function getSliderPercent(value: number, min: number, max: number): number {
  const range = max - min;

  if (range <= 0) {
    return 0;
  }

  return ((clamp(value, min, max) - min) / range) * 100;
}

export function getPointerSliderValue({
  clientX,
  trackLeft,
  trackWidth,
  min,
  max,
  step
}: PointerSliderValueOptions): number {
  if (trackWidth <= 0) {
    return clamp(min, min, max);
  }

  const clampedClientX = clamp(clientX, trackLeft, trackLeft + trackWidth);
  const percent = (clampedClientX - trackLeft) / trackWidth;
  const value = min + percent * (max - min);

  return getBoundedSteppedValue(value, min, max, step);
}

export function getDraggedSliderValue({
  value,
  deltaPixels,
  trackWidth,
  min,
  max,
  step,
  fineAdjustment
}: DraggedSliderValueOptions): number {
  if (trackWidth <= 0) {
    return clamp(value, min, max);
  }

  const range = max - min;
  const multiplier = fineAdjustment ? FINE_ADJUSTMENT_MULTIPLIER : 1;
  const nextValue = value + (deltaPixels / trackWidth) * range * multiplier;

  return getBoundedSteppedValue(nextValue, min, max, step);
}
