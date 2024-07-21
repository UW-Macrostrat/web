import { resolve, join } from "path";
import { writeFileSync } from "fs";

export function writeJSON(key, data) {
  const filePath = resolve(join(__dirname, "..", "data", key + ".json"));
  writeFileSync(filePath, JSON.stringify(data, null, 2));
}
