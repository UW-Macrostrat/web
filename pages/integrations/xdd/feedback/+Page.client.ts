import { FullscreenPage } from "~/layouts";
import styles from "./main.module.sass";
import hyper from "@macrostrat/hyper";
import { PageBreadcrumbs } from "~/components";
import { PostgRESTTableView } from "@macrostrat/data-sheet";
import { postgrestPrefix } from "@macrostrat-web/settings";

const h = hyper.styled(styles);

export function Page() {
  return h(FullscreenPage, { className: "main" }, [
    h(PageBreadcrumbs),
    h("h1", "Source text"),
    h(PostgRESTTableView, {
      endpoint: postgrestPrefix,
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
