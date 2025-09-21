import h from "./main.module.sass";
import { StickyHeader, LinkCard, PageBreadcrumbs, Footer, BetaTag } from "~/components";
import { ContentPage } from "~/layouts";
import { usePageContext } from "vike-react/usePageContext";
import { PostgRESTInfiniteScrollView } from "@macrostrat/ui-components";
import { postgrestPrefix, apiDomain } from "@macrostrat-web/settings";
import { LithologyTag, FlexRow, ExpansionPanel } from "~/components/lex/tag";

export function Page() {
  const url = usePageContext().urlOriginal.split("?")[1];

  if (!url) {
    return h(Base);
  } 

  const params = getUrlParams(url);
  const idType = params.idType;
  const id = params[idType];
  const color = params.color;
  const name = params.name;


  return h(ContentPage, [
    h(Header, { name, color, idType, id }),
    h(FilterData),
  ]);
}

function Header({ name, color, idType, id }) {
  const map = {
    'int_id': "intervals",
    'lith_id': "lithologies",
    'econ_id': "economics",
    'environ_id': "environments",
    'strat_name_id': "strat-names",
  }

  return h(StickyHeader, { className: "header" }, [
    h(PageBreadcrumbs, {
      title: h(FlexRow, { gap: ".5em", alignItems: "center" }, [
        h('p.title', 'Legends for '),
        h(LithologyTag, { data: { name, color }, href: `/lex/${map[idType]}/${id}` }),
      ]),
    }),
    h(BetaTag)
  ]);
}

function getUrlParams(urlString) {
  const params = new URLSearchParams(urlString);
  const result = {};

  for (const [key, value] of params.entries()) {
    result[key] = value;

    if (key.toLowerCase().includes('id')) {
      result.idType = key;
    }
  }

  return result;
}

function Base() {
  return h(ContentPage, { className: 'page' }, [
    h(StickyHeader, { className: "header" }, h(PageBreadcrumbs, { title: "Legends" })),
    h(PostgRESTInfiniteScrollView, {
      route: postgrestPrefix + '/legend_liths',
      id_key: 'legend_id',
      limit: 20,
      itemComponent: LegendItem,
      filterable: true,
      searchColumns: [{value: "map_unit_name", label: "Map unit name"}],
    }),
  ]);
}

function BaseUnitItem({ data }) {
  const { id, col_id, strat_name } = data;

  return h(LinkCard, {
    href: `/columns/${col_id}#unit=${id}`,
    title: strat_name,
  })
}

function FilterData() {
  const params = usePageContext().urlParsed.href.split("?")[1].split("=")
  const id = params[1].split("&")[0]

  return h(PostgRESTInfiniteScrollView, {
    route: postgrestPrefix + `/legend_liths`,
    id_key: "legend_id",
    limit: 20,
    defaultParams: {
      lith_ids: `cs.{${id}}`,
    },
    filterable: true,
    searchColumns: [{value: "map_unit_name", label: "Map unit name"}],
    itemComponent: LegendItem,
  });
}

function LegendItem({ data }) {
  const { map_unit_name, legend_id, source_id } = data;

  return h(LinkCard, {
    href: `/maps/${source_id}`,
    title: h("div.title", map_unit_name),
  });
}