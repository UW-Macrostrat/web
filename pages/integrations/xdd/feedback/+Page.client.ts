import { FullscreenPage } from "~/layouts";
import h from "./main.module.sass";
import { PageBreadcrumbs } from "~/components";
import { PostgRESTTableView } from "~/components/legend-table";

export function Page() {
  return h(FullscreenPage, { className: "main" }, [
    h(PageBreadcrumbs),
    h("h1", "Source text"),
    h(PostgRESTTableView, {
      table: "kg_source_text",
      columns:
        "id,map_legend_id,paper_id,last_update,created,n_runs,n_entities,n_matches,n_strat_names",
      columnOptions,
      order: { key: "last_update", ascending: false },
    }),
  ]);
}

function prettyDate(value) {
  // Timestamp to pretty date
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

const columnOptions = {
  overrides: {
    last_update: {
      name: "Updated",
      valueRenderer: prettyDate,
    },
    created: {
      name: "Created",
      valueRenderer: prettyDate,
    },
    id: {
      name: "ID",
      valueRenderer: sourceTextRenderer,
    },
  },
};

function sourceTextRenderer(value) {
  return h(
    "a",
    { href: `/integrations/xdd/feedback/${value}` },
    h("code", value)
  );
}
