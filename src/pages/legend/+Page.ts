import { HotkeysProvider } from "@blueprintjs/core";
import DataSheet from "@macrostrat/data-sheet2";
import { useState } from "react";
import { FullscreenPage } from "~/layouts";
import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";
import { useAsyncEffect } from "@macrostrat/ui-components";
import { ColorCell } from "@macrostrat/data-sheet2";
import { PageBreadcrumbs } from "~/renderer";
import {
  LongTextViewer,
  IntervalCell,
  lithologyRenderer,
  ExpandedLithologies,
} from "~/components/legend-table";
import { postgrest } from "~/providers";
import { useRef } from "react";

const h = hyper.styled(styles);

function preprocessData(data) {
  return data.map((d) => {
    const { best_age_bottom, best_age_top, ...rest } = d;
    return {
      ...rest,
      model_age: [best_age_bottom, best_age_top],
    };
  });
}

export function Page() {
  // const [data, setData] = useState(null);

  // useAsyncEffect(async () => {
  //   const res = await postgrest
  //     .from("legend")
  //     .select(
  //       "source_id, legend_id, name, strat_name, age, lith, descrip, comments, liths, b_interval, t_interval, best_age_bottom, best_age_top, unit_ids, concept_ids"
  //     )
  //     .order("legend_id", { ascending: true })
  //     .limit(100);
  //   setData(preprocessData(res.data));
  // }, []);

  const { data, onScroll } = useLazyLoadedPostgRESTData();

  if (data == null) {
    return h("div", "Loading...");
  }

  return h(
    HotkeysProvider,
    h(FullscreenPage, { className: "main" }, [
      h(PageBreadcrumbs),
      h("h1", "Map legend units"),
      h(DataSheet, {
        data,
        editable: false,
        columnSpecOptions: {
          overrides: {
            source_id: "Source",
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
        onVisibleCellsChange(visibleCells) {
          onScroll(visibleCells.rowIndexEnd);
        },
      }),
    ])
  );
}

function useLazyLoadedPostgRESTData() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalSize, setTotalSize] = useState(null);
  const chunkSize = 100;
  const sortKey = "legend_id";
  // Only use offset if last key is not provided
  //const [offset, setOffset] = useState(0);
  const [lastKey, setLastKey] = useState(null);

  useAsyncEffect(async () => {
    if (loading === false) return;
    try {
      const q = postgrest
        .from("legend")
        .select("*", { count: "exact" })
        .order(sortKey, { ascending: true });

      if (lastKey != null) {
        q.gt(sortKey, lastKey);
      }

      let res = await q.limit(chunkSize);

      console.log(res);
      setData((d) => [...d, ...res.data]);
      setLastKey(res.data[res.data.length - 1][sortKey]);
      setTotalSize(res.count);
      setLoading(false);
    } catch (err) {
      setError(err);
    }
  }, [loading]);

  // Create an empty array of the desired size
  const results = Array(totalSize).fill(null);
  data.forEach((d, i) => {
    results[i] = d;
  });

  return {
    data: results,
    loading,
    error,
    onScroll(rowIndex) {
      if (rowIndex > data.length - chunkSize) {
        setLoading(true);
      }
    },
  };
}
