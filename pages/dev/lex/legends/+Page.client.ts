import h from "./main.module.sass";
import { LinkCard, BetaTag } from "~/components";
import { LexListPage } from "~/components/lex";
import { usePageContext } from "vike-react/usePageContext";
import { PostgRESTInfiniteScrollView } from "@macrostrat/ui-components";
import { postgrestPrefix } from "@macrostrat-web/settings";
import { LithologyTag, FlexRow } from "~/components/lex/tag.ts";

export function Page() {
  const url = usePageContext().urlOriginal.split("?")[1];

  if (!url) {
    return h(BaseList);
  }

  return h(LegendsForItem, { url });
}

function LegendsForItem({ url }) {
  const params = getUrlParams(url);
  const idType = params.idType;
  const id = params[idType];
  const color = params.color;
  const name = params.name;

  const description = h(Header, { name, color, idType, id });

  return h(LexListPage, { description }, h(FilterData, { id }));
}

function Header({ name, color, idType, id }) {
  const map = {
    int_id: "intervals",
    lith_id: "lithologies",
    econ_id: "economics",
    environ_id: "environments",
    strat_name_id: "strat-names",
  };

  return h(
    FlexRow,
    { gap: ".5em", alignItems: "center", className: "header" },
    [
      h("h2.title", "Legends for "),
      h(LithologyTag, {
        data: { name, color },
        href: `/lex/${map[idType]}/${id}`,
      }),
      h(BetaTag),
    ]
  );
}

function getUrlParams(urlString) {
  const params = new URLSearchParams(urlString);
  const result = {};

  for (const [key, value] of params.entries()) {
    result[key] = value;

    if (key.toLowerCase().includes("id")) {
      result.idType = key;
    }
  }

  return result;
}

function BaseList() {
  return h(LexListPage, [
    h(PostgRESTInfiniteScrollView, {
      route: postgrestPrefix + "/legend_liths",
      id_key: "legend_id",
      limit: 20,
      itemComponent: LegendItem,
      filterable: true,
      searchColumns: [{ value: "map_unit_name", label: "Map unit name" }],
    }),
  ]);
}

function FilterData({ id }) {
  return h(PostgRESTInfiniteScrollView, {
    route: postgrestPrefix + `/legend_liths`,
    id_key: "legend_id",
    limit: 20,
    extraParams: {
      lith_ids: `cs.{${id}}`,
    },
    filterable: true,
    searchColumns: [{ value: "map_unit_name", label: "Map unit name" }],
    itemComponent: LegendItem,
  });
}

function LegendItem({ data }) {
  const { map_unit_name, legend_id, source_id } = data;

  return h(LinkCard, {
    href: `/maps/${source_id}?legend_id=${legend_id}`,
    title: h("div.title", map_unit_name),
  });
}
