import { fetchAPIData } from "~/_utils";

export async function data() {
  const res = await fetchAPIData(`/defs/environments`, { all: true });

  return { res };
}
