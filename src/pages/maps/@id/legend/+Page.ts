import { Breadcrumbs, HotkeysProvider, Tag } from "@blueprintjs/core";
import DataSheet from "@macrostrat/data-sheet2";
import { useState } from "react";
import { FullscreenPage } from "~/layouts";
import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";
import { useAsyncEffect, useInDarkMode } from "@macrostrat/ui-components";
import { ColorCell, Cell, asChromaColor } from "@macrostrat/data-sheet2";

import { postgrest } from "~/providers";

const h = hyper.styled(styles);

export function Page({ map }) {
  const slug = map.slug;

  const [data, setData] = useState(null);

  useAsyncEffect(async () => {
    const res = await postgrest
      .from("legend")
      .select(
        "legend_id, name, strat_name, age, lith, descrip, comments, liths, b_interval, t_interval, best_age_bottom, best_age_top, unit_ids, concept_ids"
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
      h(DataSheet, {
        data,
        columnSpecOptions: {
          overrides: {
            liths: {
              name: "Lithologies",
              cellComponent: LithologiesCell,
              //inlineEditor: false,
              dataEditor: ExpandedLithologies,
            },
            name: "Unit name",
            comments: "Comments",
            legend_id: "Legend ID",
            strat_name: "Stratigraphic names",
            b_interval: {
              name: "Lower",
              cellComponent: IntervalCell,
            },
            t_interval: {
              name: "Upper",
              cellComponent: IntervalCell,
            },
            color: {
              name: "Color",
              cellComponent: ColorCell,
            },
          },
        },
      }),
    ])
  );
}

function IntervalCell({ value, children, ...rest }) {
  return h(ColorCell, { value: value?.color, ...rest }, value?.name);
}

function LithologiesCell({ value, children, ...rest }) {
  const names = value?.map((d) => h(LithTag, { data: d }));
  return h(Cell, { ...rest, className: "inline-lithology" }, addJoiner(names));
}

function LithTag({ data }) {
  const darkMode = useInDarkMode();
  const luminance = darkMode ? 0.9 : 0.4;
  const color = asChromaColor(data.color);
  return h(
    "span.lithology",
    {
      key: data.id,
      style: {
        color: color?.luminance(luminance).hex(),
        backgroundColor: color?.luminance(1 - luminance).hex(),
      },
    },
    data.name
  );
}

function ExpandedLithologies({ value, onChange }) {
  const darkMode = useInDarkMode();
  const names = value?.map((d) => {
    return h("div", { key: d.id }, [
      h(LithTag, { data: d }),
      h(
        "div.basis",
        d?.basis_cols?.map((d) => h(Tag, { minimal: true }, d))
      ),
    ]);
  });
  return h("div", {}, "Hello, world!");
}

function addJoiner(arr) {
  return arr?.reduce((acc, curr) => [acc, " ", curr]);
}
