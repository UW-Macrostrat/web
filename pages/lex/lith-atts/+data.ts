import { fetchAPIData } from "~/_utils";
import { nestLithAttributes } from "@macrostrat-web/lithology-hierarchy";

export async function data() {
  const res = await fetchAPIData(`/defs/lithology_attributes`, { all: true });

  return { data: nestLithAttributes(res) };
}
