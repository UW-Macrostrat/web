/** `geodesy` ships no types; these cover the handful of calls the location
 * editor makes. */
declare module "geodesy/dms.js" {
  const Dms: {
    parse(dms: string | number): number;
    toLat(deg: number, format?: string, dp?: number): string;
    toLon(deg: number, format?: string, dp?: number): string;
    separator: string;
  };
  export default Dms;
}

declare module "geodesy/utm.js" {
  export class LatLon {
    constructor(lat: number, lon: number);
    lat: number;
    lon: number;
    toUtm(zoneOverride?: number): Utm;
  }
  export default class Utm {
    zone: number;
    hemisphere: "N" | "S";
    easting: number;
    northing: number;
    static parse(text: string): Utm;
    toLatLon(): LatLon;
    toString(digits?: number): string;
  }
}

declare module "geodesy/mgrs.js" {
  import Utm from "geodesy/utm.js";
  export class LatLon {
    constructor(lat: number, lon: number);
    toUtm(zoneOverride?: number): Utm & { toMgrs(): Mgrs };
  }
  export default class Mgrs {
    zone: number;
    band: string;
    e100k: string;
    n100k: string;
    static parse(text: string): Mgrs;
    toUtm(): Utm;
    toString(digits?: number): string;
  }
}
