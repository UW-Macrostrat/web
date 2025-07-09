import { ContentPage, FullscreenPage } from "~/layouts";
import styles from "./main.module.sass";
import hyper from "@macrostrat/hyper";
import { LinkCard, PageBreadcrumbs } from "~/components";
import { postgrestPrefix } from "@macrostrat-web/settings";
import { PostgRESTInfiniteScrollView } from "@macrostrat/ui-components";
import { DataField } from "~/components/unit-details";
import { Switch } from "@blueprintjs/core";

const h = hyper.styled(styles);

export function Page() {
  return h(ContentPage, { className: "main" }, [
    h(PageBreadcrumbs),
    h("h1", "Source text"),
    h(PostgRESTInfiniteScrollView, {
      route: postgrestPrefix + 'kg_source_text',
      id_key: 'id',
      limit: 20,
      ascending: false,
      itemComponent: SourceTextItem,
      filterable: true,
      // toggles: h('h1', "Toggles here"),
    }),
  ]);
}

function SourceTextItem({ data }) {
  const { id, paragraph_text, created, last_update, n_runs, n_entities, n_matches, n_strat_names } = data;

  return h(LinkCard, {
    className: "source-text-item",
    href: `/integrations/xdd/feedback/${id}`,
    title: '#' + id + ' - ' + prettyDate(last_update),
  }, h('div.link-content', [
    h('p.text', paragraph_text),
      h('div.numbers', [
        h(DataField, {
          className: 'number-field',
          label: 'Runs',
          value: n_runs,
        }),
        h(DataField, {
          className: 'number-field',
          label: 'Entities',
          value: n_entities,
        }),
        h(DataField, {
          className: 'number-field',
          label: 'Matches',
          value: n_matches,
        }),
        h(DataField, {
          className: 'number-field',
          label: 'Stratigraphic Names',
          value: n_strat_names,
        }),
      ]),
  ]));
}

function prettyDate(value) {
  // Timestamp to pretty date
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}