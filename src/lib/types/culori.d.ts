declare module 'culori' {
  export interface CuloriColor {
    alpha?: number;
    [key: string]: number | string | undefined;
  }

  export interface CuloriOklch extends CuloriColor {
    mode?: 'oklch';
    l?: number;
    c?: number;
    h?: number;
  }

  export interface CuloriRgb extends CuloriColor {
    mode?: 'rgb';
    r?: number;
    g?: number;
    b?: number;
  }

  export function clampRgb(color: CuloriColor): CuloriColor;

  export function converter(mode: 'oklch'): (color: unknown) => CuloriOklch | undefined;
  export function converter(mode: 'rgb'): (color: unknown) => CuloriRgb | undefined;
  export function converter(mode: string): (color: unknown) => CuloriColor | undefined;

  export function displayable(color: unknown): boolean;
  export function formatCss(color: unknown): string | undefined;
  export function parse(color: string): CuloriColor | undefined;
}
