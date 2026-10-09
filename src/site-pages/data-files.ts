/** The vault's `Site/data/` records, parsed once. Server only. */
import { parse as parseYaml } from "yaml";

const dataFiles = import.meta.glob("../../content/Site/data/*.{yml,json}", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const parsedData = new Map<string, any>();

/** `Site/data/<name>.yml` or `.json`, parsed once. */
export function readDataFile(name: string): any {
  if (parsedData.has(name)) return parsedData.get(name);
  const base = `../../content/Site/data/${name}`;
  let data = null;
  if (dataFiles[`${base}.yml`] != null) {
    data = parseYaml(dataFiles[`${base}.yml`]);
  } else if (dataFiles[`${base}.json`] != null) {
    data = JSON.parse(dataFiles[`${base}.json`]);
  } else {
    console.warn(`[site-pages] no data file Site/data/${name}.yml or .json`);
  }
  parsedData.set(name, data);
  return data;
}
