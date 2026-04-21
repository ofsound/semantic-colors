import { describe, expect, it } from 'vitest';
import {
  hexToRgb,
  hsvToRgb,
  normalizeHexInput,
  pickerPointToHsv,
  pickerPositionFromHsv,
  parseRgbInput,
  rgbToHsv
} from './color';

describe('extension color helpers', () => {
  it('round-trips between rgb and hsv for picker sync', () => {
    const rgb = { r: 84, g: 83, b: 0 };
    const hsv = rgbToHsv(rgb);

    expect(hsv).toEqual({
      h: expect.closeTo(59.29, 2),
      s: expect.closeTo(100, 2),
      v: expect.closeTo(32.94, 2)
    });
    expect(hsvToRgb(hsv)).toEqual(rgb);
  });

  it('maps picker coordinates with the same two-zone hsv plane as the app picker', () => {
    expect(pickerPointToHsv(200, 100, 100, 25)).toEqual({
      h: 180,
      s: 100,
      v: 50
    });
    expect(pickerPointToHsv(200, 100, 100, 75)).toEqual({
      h: 180,
      s: 50,
      v: 100
    });
    expect(pickerPositionFromHsv({ h: 180, s: 50, v: 100 })).toEqual({
      xPercent: '50%',
      yPercent: '75%'
    });
  });

  it('accepts achromatic hex and flexible rgb input formats', () => {
    expect(normalizeHexInput('#fff')).toBe('#FFFFFF');
    expect(hexToRgb('#fff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseRgbInput('rgb(84, 83, 0)')).toEqual({ r: 84, g: 83, b: 0 });
    expect(parseRgbInput('84 83 0')).toEqual({ r: 84, g: 83, b: 0 });
  });
});
