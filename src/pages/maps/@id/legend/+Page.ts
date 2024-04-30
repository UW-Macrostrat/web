import { HotkeysProvider, Tag } from "@blueprintjs/core";
import DataSheet from "@macrostrat/data-sheet2";
import { useState } from "react";
import { FullscreenPage } from "~/layouts";
import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";
import { useAsyncEffect } from "@macrostrat/ui-components";
import { ColorCell } from "@macrostrat/data-sheet2";
import { PageBreadcrumbs } from "~/renderer";
import { LithologyTag } from "~/components";

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
      h(PageBreadcrumbs),
      h("h1", map.name + " map units"),
      h(DataSheet, {
        data,
        columnSpecOptions: {
          overrides: {
            liths: {
              name: "Lithologies",
              valueRenderer: lithologyRenderer,
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
            descrip: {
              name: "Description",
              dataEditor: LongTextViewer,
            },
          },
        },
      }),
    ])
  );
}

function LongTextViewer({ value, onChange }) {
  return h("div.long-text", value);
}

function IntervalCell({ value, children, ...rest }) {
  return h(ColorCell, { value: value?.color, ...rest }, value?.name);
}

function lithologyRenderer(value) {
  return h("span.liths", [
    addJoiner(value?.map((d) => h(LithologyTag, { data: d }))),
  ]);
}

function ExpandedLithologies({ value, onChange }) {
  console.log(value);
  if (value == null) return h("div.basis-panel", "No lithologies");
  return h("div.basis-panel", [
    h("table", [
      h("thead", h("tr", [h("th", "Lithology"), h("th", "Source")])),
      h(
        "tbody",
        value.map((d) => {
          return h("tr", { key: d.id }, [
            h("td", h(LithologyTag, { data: d })),
            h(
              "td.basis-col",
              addJoiner(
                d.basis_col?.map((d) => {
                  return h(Tag, { minimal: true, key: d }, [
                    h("span.tag-header", "Column"),
                    " ",
                    h("code", d),
                  ]);
                })
              )
            ),
          ]);
        })
      ),
    ]),
  ]);
}

function addJoiner(arr) {
  return arr?.reduce((acc, curr) => [acc, " ", curr]);
}
