import { format } from "d3-format";

export function joinURL(...args) {
  let newURL = args[0];
  for (let i = 1; i < args.length; i++) {
    newURL = newURL.replace(/\/$/, "") + "/" + args[i].replace(/^\//, "");
  }
  return newURL;
}

export const fmt4 = format(".4~f");
export const fmt3 = format(".3~f");
export const fmt2 = format(".2~f");
export const fmt1 = format(".1~f");
export const fmtInt = format(".0f");
