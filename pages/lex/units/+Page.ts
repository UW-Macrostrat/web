import h from "./main.module.sass";
import { StickyHeader, LinkCard, PageBreadcrumbs } from "~/components";
import { ContentPage } from "~/layouts";
import { useState, useEffect } from "react";
import { fetchAPIData } from "~/_utils";
import { usePageContext } from "vike-react/usePageContext";

export function Page() {
  const [data, setData] = useState(null);

  const filter = usePageContext().urlOriginal.split("?")[1];
  const [field, value] = filter.split("=");

  useEffect(() => {
    fetchAPIData("/units", {
      [field]: value
    }).then((res) => setData(res));
  }, []);


  return h(ContentPage, [
    h(StickyHeader, { className: "header" }, [
      h(PageBreadcrumbs, {
        title: "Units",
      }),
      data?.map((d) => h(UnitItem, { key: d.id, data: d })),
    ]),
  ]);
}

function UnitItem({ data }) {
  const { unit_id, col_id, unit_name } = data;

  return h(LinkCard, {
    href: `/columns/${col_id}#unit=${unit_id}`,
    className: "mineral-item",
    title: unit_name,
  });
}