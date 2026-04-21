declare module 'apca-w3' {
  export function APCAcontrast(textY: number, backgroundY: number, places?: number): number;

  export function sRGBtoY(rgb?: [number, number, number]): number;
}
