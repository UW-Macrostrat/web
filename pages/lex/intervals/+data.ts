import { fetchAPIData } from "~/_utils";

export async function data() {
  const res = await fetchAPIData(`/defs/intervals`, { all: true });

  return { res };
}
