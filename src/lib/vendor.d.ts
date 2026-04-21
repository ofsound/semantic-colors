declare module 'culori' {
  export function clampRgb(color: unknown): unknown;
  export function converter(mode: string): (color: unknown) => any;
  export function displayable(color: unknown): boolean;
  export function formatCss(color: unknown): string | undefined;
  export function parse(color: string): unknown;
}

declare module 'apca-w3' {
  export function APCAcontrast(textY: number, backgroundY: number, places?: number): number;
  export function sRGBtoY(rgb?: [number, number, number]): number;
}
