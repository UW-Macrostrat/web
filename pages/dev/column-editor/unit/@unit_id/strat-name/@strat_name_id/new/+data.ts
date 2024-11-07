import {
  fetchIdsFromUnitId,
  IdsFromUnit,
} from "@macrostrat-web/column-builder";

export interface StratNameData {
  name: string | undefined;
  unit_id: number;
  query: IdsFromUnit;
}

export async function getServerSideProps(
  ctx: GetServerSidePropsContext
): Promise<StratNameData> {
  let {
    query: { unit_id },
  } = ctx;
  if (Array.isArray(unit_id)) {
    unit_id = unit_id[0];
  } else if (typeof unit_id == "undefined") {
    unit_id = "0";
  }

  const query: IdsFromUnit = await fetchIdsFromUnitId(parseInt(unit_id));

  return { props: { unit_id, query } };
}
