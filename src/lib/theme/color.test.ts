import { describe, expect, it } from 'vitest';
import {
  hsvToRgb,
  parseColor,
  parseRgbInput,
  pickerPointToHsv,
  pickerPositionFromHsv,
  rgbToHsv,
  toHexColor
} from './color';

describe('color helpers', () => {
  it('parses achromatic colors without dropping hue-less values', () => {
    expect(parseColor('#ffffff')).toEqual({
      l: expect.any(Number),
      c: 0,
      h: 0,
      alpha: 1
    });
    expect(parseColor('#000000')).toEqual({
      l: expect.any(Number),
      c: 0,
      h: 0,
      alpha: 1
    });
  });

  it('round-trips between rgb and hsv for picker updates', () => {
    const rgb = { r: 84, g: 83, b: 0 };
    const hsv = rgbToHsv(rgb);

    expect(hsv).toEqual({
      h: expect.closeTo(59.29, 2),
      s: expect.closeTo(100, 2),
      v: expect.closeTo(32.94, 2)
    });
    expect(hsvToRgb(hsv)).toEqual(rgb);
  });

  it('maps picker coordinates with the same two-zone hsv plane as gemini-colors', () => {
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

  it('accepts flexible rgb input strings and hex conversion stays uppercase', () => {
    expect(parseRgbInput('rgb(84, 83, 0)')).toEqual({ r: 84, g: 83, b: 0 });
    expect(parseRgbInput('84 83 0')).toEqual({ r: 84, g: 83, b: 0 });
    expect(toHexColor({ l: 0.43, c: 0.11, h: 108 })).toMatch(/^#[0-9A-F]{6}$/);
  });
});
