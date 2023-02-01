import { format } from "d3-format";

export function formatCoordForZoomLevel(val: number, zoom: number): string {
  if (zoom < 2) {
    return fmt1(val);
  } else if (zoom < 4) {
    return fmt2(val);
  } else if (zoom < 7) {
    return fmt3(val);
  }
  return fmt4(val);
}

export const fmt4 = format(".4~f");
export const fmt3 = format(".3~f");
export const fmt2 = format(".2~f");
export const fmt1 = format(".1~f");
export const fmtInt = format(".0f");
