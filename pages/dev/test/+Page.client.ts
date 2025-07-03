import h from "@macrostrat/hyper";
import { useState } from "react";
import { ExpansionPanel } from "@macrostrat/map-interface";
import { useAPIResult } from "@macrostrat/ui-components";
import { apiV2Prefix } from "@macrostrat-web/settings";

export function Page() {
  const res = useAPIResult(apiV2Prefix + "/geologic_units/map/legend?lith_id=1")
    ?.success.data;

    const params = new URLSearchParams({
    is_finalized: "eq.true",
    status_code: "eq.active",
    or: `(ref_year.lt.9999,and(ref_year.eq.9999,source_id.gt.0))`,
    limit: 20,
    order: "ref_year.desc,source_id.asc",
  }).toString()

  console.log('params', params);

  if (!res) {
    return h("div", "Loading...");
  }
  return h(Maps, { mapsData: res });
}

function Maps({ mapsData }) {
  const ITEMS_PER_PAGE = 10;
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const data = mapsData.slice(0, visibleCount);

  const visibleItems = data.map((item) =>
    h(
      "a.maps-item",
      {
        key: item.map_unit_name,
        href: "/maps/" + item.source_id + "?legend=" + item.legend_id,
      },
      item.map_unit_name + " (#" + item.source_id + ")"
    )
  );

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + ITEMS_PER_PAGE, mapsData.length));
  };

  const showLoadMore = visibleCount < mapsData.length;

  return h("div.maps-container", [
    h(
      ExpansionPanel,
      { title: "Maps" },
      h("div.maps-list", [
        ...visibleItems,
        h.if(showLoadMore)(
          "button.load-more-btn",
          { onClick: handleLoadMore },
          "Load More"
        ),
      ])
    ),
  ]);
}
