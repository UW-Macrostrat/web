import { fetchAPIData } from "~/_utils";

export async function data() {
  const res = await fetchAPIData(`/defs/lithology_attributes`, { all: true });

  return { res };
}
