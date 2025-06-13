import { fetchAPIData } from "~/_utils";

export async function data() {
  const res = await fetchAPIData(`/defs/structures`, { all: true });

  return { res };
}
