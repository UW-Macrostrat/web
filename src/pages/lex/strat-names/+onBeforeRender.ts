import { postgrestPrefix } from "@macrostrat-web/settings";
import fetch from "node-fetch";

const apiAddress =
  postgrestPrefix + "/strat_names_units_kg?kg_liths=not.is.null";

type ColumnGroup = {
  id: number;
  name: string;
  columns: Array<any>;
};

export async function onBeforeRender(pageContext) {
  // `.page.server.js` files always run in Node.js; we could use SQL/ORM queries here.
  const response = await fetch(apiAddress + "?limit=50");
  const res = await response.json();

  const data = res.map(processStratName);

  const pageProps = { data };
  return {
    pageContext: {
      pageProps,
    },
  };
}

function deduplicateArray<T = any>(arr: T[], keyFn = (d) => d.id): T[] {
  let index = {};
  for (const item of arr) {
    index[keyFn(item)] = item;
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

function processStratName(d, includeColors = false) {
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
