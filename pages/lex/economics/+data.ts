import { fetchAPIData } from "~/_utils";

export async function data() {
  const res = await fetchAPIData(`/defs/econs`, { all: true });

  return { res };
}
