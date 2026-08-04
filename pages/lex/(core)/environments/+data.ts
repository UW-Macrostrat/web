import { fetchAPIData } from "~/_utils";
import { nestItems } from "@macrostrat-web/lithology-hierarchy";

export async function data() {
  const res = await fetchAPIData(`/defs/environments`, { all: true });
  return { data: nestItems(res) };
}
