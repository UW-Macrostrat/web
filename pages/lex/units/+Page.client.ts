import h from "./main.module.sass";
import { StickyHeader, LinkCard, PageBreadcrumbs, Footer } from "~/components";
import { ContentPage } from "~/layouts";
import { useState, useEffect } from "react";
import { fetchAPIData } from "~/_utils";
import { usePageContext } from "vike-react/usePageContext";
import { LithologyTag } from "@macrostrat/data-components";
import { FlexRow } from "@macrostrat/ui-components";


export function Page() {
  const [data, setData] = useState(null);

  const params = getUrlParams(usePageContext().urlOriginal.split("?")[1]);
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
    h('div.units', [
      data?.map((d) => h(UnitItem, { key: d.id, data: d })),
    ]),
    h(Footer)
  ]);
}

function UnitItem({ data }) {
  const { unit_id, col_id, unit_name } = data;

  return h(LinkCard, {
    href: `/columns/${col_id}#unit=${unit_id}`,
    className: "unit-item",
    title: unit_name,
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
        h('h3.title', 'Units for '),
        h(LithologyTag, { data: { name, color }, onClick: () => { window.open(`/lex/${map[idType]}/${id}`, "_self")} }),
      ]),
    })
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
