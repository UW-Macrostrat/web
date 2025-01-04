import { FullscreenPage } from "~/layouts";
import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";
import { PageBreadcrumbs } from "~/components";
import { PostgRESTTableView } from "@macrostrat/data-sheet2";
import { postgrestPrefix } from "@macrostrat-web/settings";

const h = hyper.styled(styles);

export function Page() {
  return h(FullscreenPage, { className: "main" }, [
    h(PageBreadcrumbs),
    h("h1", "Model runs"),
    h(PostgRESTTableView, {
      endpoint: postgrestPrefix,
      table: "kg_model_run",
      columns:
        "id,timestamp,model_id,version_id,source_text_id,map_legend_id,supersedes,superseded_by",
      columnOptions,
      order: { key: "timestamp", ascending: false },
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
    timestamp: {
      name: "Time",
      valueRenderer: prettyDate,
    },
    source_text_id: {
      name: "Source text",
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
