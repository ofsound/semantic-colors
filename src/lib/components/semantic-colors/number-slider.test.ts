import { describe, expect, it } from 'vitest';

import { getDraggedSliderValue } from './number-slider';

describe('getDraggedSliderValue', () => {
  it('reduces drag sensitivity to one-fifth while fine adjustment is active', () => {
    const baseOptions = {
      value: 0.5,
      deltaPixels: 50,
      trackWidth: 100,
      min: 0,
      max: 1,
      step: 0.005
    };

    expect(
      getDraggedSliderValue({
        ...baseOptions,
        fineAdjustment: false
      })
    ).toBe(1);

    expect(
      getDraggedSliderValue({
        ...baseOptions,
        fineAdjustment: true
      })
    ).toBe(0.6);
  });

  it('snaps the dragged value to the configured step and clamps to bounds', () => {
    expect(
      getDraggedSliderValue({
        value: 0.19,
        deltaPixels: 10,
        trackWidth: 100,
        min: 0,
        max: 1,
        step: 0.005,
        fineAdjustment: true
      })
    ).toBe(0.21);

    expect(
      getDraggedSliderValue({
        value: -175,
        deltaPixels: -20,
        trackWidth: 100,
        min: -180,
        max: 180,
        step: 1,
        fineAdjustment: false
      })
    ).toBe(-180);
  });
});
