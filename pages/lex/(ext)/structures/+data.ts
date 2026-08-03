import { fetchAPIData } from "~/_utils";
import { nestItems } from "@macrostrat-web/lithology-hierarchy/src/nest-data.ts";

export type Data = {
  structuresTree: any;
};

export async function data(): Promise<Data> {
  const res = await fetchAPIData(`/defs/structures`, { all: true });

  const structuresTree = nestItems(
    res.map((d) => {
      return {
        ...d,
        type: d.structure_type,
      };
    })
  );

  return { structuresTree };
}
