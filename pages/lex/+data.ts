import { fetchAPIData } from "~/_utils";

export async function data() {
  const res = await fetchAPIData(`/stats`, { all: true });

  return { res };
}
