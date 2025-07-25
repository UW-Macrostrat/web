import { ContentPage, FullscreenPage } from "~/layouts";
import styles from "./main.module.sass";
import hyper from "@macrostrat/hyper";
import { LinkCard, PageBreadcrumbs } from "~/components";
import { postgrestPrefix } from "@macrostrat-web/settings";
import { PostgRESTInfiniteScrollView } from "@macrostrat/ui-components";
import { DataField } from "~/components/unit-details";
import { Switch } from "@blueprintjs/core";
import { useState } from "react";
import { usePageContext } from "vike-react/usePageContext";
import { SearchBar } from "~/components/general";
import { MultiSelect, ItemRenderer, ItemPredicate } from "@blueprintjs/select";

const h = hyper.styled(styles);

export function Page() {
  const type = usePageContext()?.urlOriginal?.split('=')[1]
  const [showDetails, setShowDetails] = useState(type !== '0');
  const [showNoFeedback, setShowNoFeedback] = useState(false);

  const toggles = h('div.toggles', [
    h(Switch, {
      checked: showDetails,
      label: "Show details",
      onChange: (e) => {
        setShowDetails(e.target.checked);
      },
    }),
    h(Switch, {
      checked: showNoFeedback,
      label: "Show texts with no feedback",
      onChange: (e) => {
        setShowNoFeedback(e.target.checked);
      },
    }),
  ]);

  const extraParams = showNoFeedback ?
    {
      has_feedback: "is.false",
    } : undefined;

  return h(ContentPage, { className: "main" }, [
    h(PageBreadcrumbs, {showLogo: true}),
    h("h1", "Source text"),
    h(PostgRESTInfiniteScrollView, {
      route: postgrestPrefix + '/kg_source_text_casted',
      id_key: 'id',
      limit: 20,
      ascending: false,
      itemComponent: showDetails ? SourceTextItemDetailed : SourceTextItem,
      filterable: true,
      toggles,
      searchColumns: [
        { label: "Paragraph Text", value: 'paragraph_text'},
        { label: "Date", value: 'created' },
        { label: "Model", value: 'model_name' },
      ],
      SearchBarComponent: SearchBar,
      MultiSelectComponent: MultiSelect,
      extraParams
    }),
  ]);
}

function SourceTextItemDetailed({ data }) {
  console.log("SourceTextItemDetailed", data);
  const { id, paragraph_text, last_update, n_runs, n_entities, n_matches, n_strat_names } = data;

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

function SourceTextItem({ data }) {
  const { id, paragraph_text, last_update } = data;

  return h(LinkCard, {
    className: "text",
    href: `/integrations/xdd/feedback/${id}`,
    title: '#' + id + ' - ' + prettyDate(last_update),
  }, paragraph_text.slice(0,100) + '...');
}

function prettyDate(value) {
  // Timestamp to pretty date
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}