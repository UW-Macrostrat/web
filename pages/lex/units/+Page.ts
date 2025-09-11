import h from "./main.module.sass";
import { StickyHeader, LinkCard, PageBreadcrumbs, Footer, BetaTag } from "~/components";
import { ContentPage } from "~/layouts";
import { useState, useEffect } from "react";
import { fetchAPIData } from "~/_utils";
import { usePageContext } from "vike-react/usePageContext";
import { PostgRESTInfiniteScrollView } from "@macrostrat/ui-components";
import { postgrestPrefix } from "@macrostrat-web/settings";
import { LithologyTag, FlexRow, ExpansionPanel } from "~/components/lex/tag";

export function Page() {
  const url = usePageContext().urlOriginal.split("?")[1];

  if (!url) {
    return h(Base);
  } 

  const [data, setData] = useState(null);

  console.log(data)

  const params = getUrlParams(url);
  const idType = params.idType;
  const id = params[idType];
  const color = params.color;
  const name = params.name;

  useEffect(() => {
    fetchAPIData("/units", {
      [idType]: id
    }).then((res) => setData(res));
  }, []);


  return h(ContentPage, [
    h(Header, { name, color, idType, id }),
    h(GroupUnits, { data }),
    h(Footer)
  ]);
}

function GroupUnits({ data }) {
  if (!data) return h('div.units', 'No data available');

  // Group by unit_name
  const grouped = data.reduce((acc, item) => {
    const key = item.unit_name || 'Unknown';
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});

  // Render grouped units
  return h('div.units', 
    Object.entries(grouped).map(([unitName, items]) =>
      h(ExpansionPanel, { 
        key: unitName, 
        title: h('div.unit-title', [
          h('h3', unitName),
          h('p.count', `(${items.length})`)
        ]), 
      }, [
        ...items.map((d) => h(UnitItem, { key: d.id, data: d })),
      ])
    )
  );
}

function UnitItem({ data }) {
  const { unit_id, col_id, unit_name } = data;

  return h(LinkCard, {
    href: `/columns/${col_id}#unit=${unit_id}`,
    className: "unit-item",
    title: `Column #${col_id}: ${unit_name} (#${unit_id})`,
  });
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
        h('p.title', 'Units for '),
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
    h(StickyHeader, { className: "header" }, h(PageBreadcrumbs, { title: "Units" })),
    h(PostgRESTInfiniteScrollView, {
      route: postgrestPrefix + '/units',
      id_key: 'id',
      limit: 20,
      itemComponent: BaseUnitItem,
      filterable: true,
      searchColumns: [{ value: "strat_name", label: "Name" }],
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