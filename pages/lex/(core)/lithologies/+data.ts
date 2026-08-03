import { fetchAPIData } from "~/_utils";
import { nestItems } from "@macrostrat-web/lithology-hierarchy";

export type Data = {
  data: any;
};

export async function data(): Promise<Data> {
  const res = await fetchAPIData(`/defs/lithologies`, { all: true });
  return { data: nestItems(res) };
}
