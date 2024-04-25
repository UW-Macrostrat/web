import { Breadcrumbs, HotkeysProvider } from "@blueprintjs/core";
import DataSheet from "@macrostrat/data-sheet2";
import { useState } from "react";
import { FullscreenPage } from "~/layouts";
import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";
import { useAsyncEffect } from "@macrostrat/ui-components";

import { postgrest } from "~/providers";

const h = hyper.styled(styles);

export function Page({ map }) {
  const slug = map.slug;
  //console.log("Page", map.source_id);

  const [data, setData] = useState(null);

  useAsyncEffect(async () => {
    const res = await postgrest
      .from("legend")
      .select(
        "legend_id, name, strat_name, age, lith, descrip, comments, b_interval, t_interval, best_age_bottom, best_age_top, color, unit_ids, concept_ids, liths"
      )
      .eq("source_id", map.source_id)
      .order("legend_id", { ascending: true });
    setData(res.data);
  }, [map.source_id]);

  return h(
    HotkeysProvider,
    h(FullscreenPage, { className: "main" }, [
      h(Breadcrumbs, {
        items: [
          { text: "Macrostrat", href: "/" },
          { text: "Maps", href: "/maps" },
          { text: h("code", slug), href: `/maps/${map.source_id}` },
          { text: "Legend" },
        ],
      }),
      h("h1", map.name + " map units"),
      h("div.data-sheet-container", h(DataSheet, { data })),
    ])
  );
}
