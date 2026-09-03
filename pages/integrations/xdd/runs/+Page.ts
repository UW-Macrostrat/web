import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";
import { PageBreadcrumbs } from "~/components";
import { PostgRESTTableView } from "@macrostrat/data-sheet";
import { postgrestPrefix } from "@macrostrat-web/settings";
import { formatDate, sourceTextHref } from "~/components/knowledge-graph";

const h = hyper.styled(styles);

/** Every model run, newest first. The `fullscreen` layout has no chrome of its
 * own, so breadcrumbs are rendered here. */
export function Page() {
  return h("div.main", [
    h(PageBreadcrumbs, { separateTitle: false }),
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

const columnOptions = {
  overrides: {
    timestamp: {
      name: "Time",
      valueRenderer: formatDate,
    },
    source_text_id: {
      name: "Source text",
      valueRenderer: sourceTextRenderer,
    },
  },
};

function sourceTextRenderer(value) {
  return h("a", { href: sourceTextHref(value) }, h("code", value));
}
