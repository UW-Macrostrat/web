import mod from "@supabase/postgrest-js";
import { postgrestPrefix } from "@macrostrat-web/settings";
const { PostgrestClient } = mod;

const postgrest = new PostgrestClient(postgrestPrefix);

export async function fetchStratNames() {
  const res = await postgrest
    .from("strat_names_units_kg")
    .select("*")
    .not("kg_liths", "is", null)
    .limit(20);
  console.log(res);
  const data = res.data;
  return data.map((d) => processStratName(d));
}

function deduplicateArray<T = any>(arr: T[], keyFn = (d) => d.id): T[] {
  let index = {};
  for (const item of arr) {
    const ident = keyFn(item);
    if (ident == null) {
      continue;
    }
    index[ident] = item;
  }
  return Object.values(index);
}

type Attr = {
  id: number;
  name: string;
  type: string;
};

type Lith = {
  id: number;
  name: string;
  props?: Array<number>;
  atts: Array<Attr>;
  units: Array<number>;
};

export function processStratName(d, includeColors = false) {
  // Deduplicate liths array
  const { units, kg_liths, ...rest } = d;
  let lithIndex = {};
  // Create an index of liths
  for (const unit of units ?? []) {
    for (const lith of unit.liths) {
      lithIndex[lith.id] ??= { ...lith, atts: [], props: [], units: [] };
      lithIndex[lith.id].props.push(lith.prop);
      lithIndex[lith.id].units.push(unit.id);
      if (lith.atts != null && lith.atts.length > 0) {
        lithIndex[lith.id].atts.push(...lith.atts);
      }
    }
  }

  const processAtts = (atts: Attr[]): Attr[] => {
    const attsLength = atts?.length ?? 0;
    if (attsLength === 0) {
      return atts ?? [];
    }
    let atts1 = deduplicateArray(atts);

    if (!includeColors) {
      atts1 = atts1.filter((att) => {
        return att.type != "color";
      });
    }

    atts1 = atts1.sort((a, b) => {
      return a.name.localeCompare(b.name);
    });
    return atts1;
  };

  const liths = Object.values(lithIndex).map((lith: Lith) => {
    return {
      ...lith,
      atts: processAtts(lith.atts),
    };
  });

  const kgLithsNew = kg_liths?.map((lith) => {
    return {
      ...lith,
      atts: processAtts(lith.atts),
    };
  });

  return {
    ...rest,
    units:
      units?.map((unit) => {
        return { id: unit.id, col_id: unit.col_id };
      }) ?? [],
    liths,
    kg_liths: kgLithsNew,
  };
}
