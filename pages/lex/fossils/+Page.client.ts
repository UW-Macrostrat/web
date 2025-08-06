import h from "./main.module.sass";
import { StickyHeader, LinkCard, PageBreadcrumbs, Footer } from "~/components";
import { ContentPage } from "~/layouts";
import { useState, useEffect } from "react";
import { fetchAPIData } from "~/_utils";
import { usePageContext } from "vike-react/usePageContext";
import { ClientOnly } from "vike-react/ClientOnly";
import { FlexRow } from "@macrostrat/ui-components";
import { PostgRESTInfiniteScrollView } from "@macrostrat/ui-components";
import { postgrestPrefix } from "@macrostrat-web/settings";

function LithologyTag(props) {
  return h(
    ClientOnly,
    {
      load: () => import("~/components/lex/lithology-tag.client").then((d) => d.LithologyTagInner),
      deps: [props.data, props.href],
    },
    (component) => h(component, props)
  );
}

export function Page() {
  const url = usePageContext().urlOriginal.split("?")[1];

  if (!url) {
    return h(Base);
  } 

  const [data, setData] = useState(null);

  const params = getUrlParams(url);
  const idType = params.idType;
  const id = params[idType];
  const color = params.color;
  const name = params.name;

  useEffect(() => {
    fetchAPIData("/fossils", {
      [idType]: id
    }).then((res) => setData(res));
  }, []);

  return h(ContentPage, [
    h(Header, { name, color, idType, id }),
    h('div.units', [
      data?.map((d) => h(FossilItem, { key: d.id, data: d })),
    ]),
    h(Footer)
  ]);
}

function FossilItem({ data }) {
  const { cltn_name, cltn_id } = data;

  return h(LinkCard, {
    href: 'https://paleobiodb.org/classic/displayCollResults?collection_no=col:' + cltn_id,
    className: "fossil-item",
    title: cltn_name,
  });
}

function Header({ name, color, idType, id }) {
  const map = {
    'int_id': "intervals",
    'lith_id': "lithologies",
    'econ_id': "economics",
    'environ_id': "environments",
    'strat_name_id': "strat-names",
    'strat_name_concept_id': "strat-concepts",
  }

  return h(StickyHeader, { className: "header" }, [
    h(PageBreadcrumbs, {
      title: h(FlexRow, { gap: ".5em", alignItems: "center" }, [
        h('p.title', 'Fossils for '),
        h(LithologyTag, { data: { name, color }, href: `/lex/${map[idType]}/${id}` }),
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

function Base() {
  return h(ContentPage, { className: 'page' }, [
    h(StickyHeader, { className: "header" }, h(PageBreadcrumbs, { title: "Fossils" })),
    h(PostgRESTInfiniteScrollView, {
      route: postgrestPrefix + '/fossils',
      id_key: 'collection_no',
      limit: 20,
      itemComponent: BaseFossilItem,
      filterable: true,
      searchColumns: [{ value: 'name', label: 'Fossil Name' }],
    }),
  ]);
}

function BaseFossilItem({ data }) {
  const { name, collection_no } = data;

  return h(LinkCard, {
    href: 'https://paleobiodb.org/classic/displayCollResults?collection_no=col:' + collection_no,
    className: "fossil-item",
    title: name,
  });
}