import hyper from "@macrostrat/hyper";
import styles from "~/components/knowledge-graph/knowledge-graph.module.sass";
import { useData } from "vike-react/useData";
import { useState } from "react";
import { AnchorButton, Button, ButtonGroup, Tag } from "@blueprintjs/core";
import { AuthStatus } from "@macrostrat/form-components";
import { Identifier } from "@macrostrat/data-components";
import { createDataCard, SelectionInteractionStyle } from "@macrostrat/data-sheet";
import classNames from "classnames";
import { InfiniteScrollPage } from "~/components";
import {
  formatDate,
  kgRoot,
  openOnClick,
  paperSourceTextsHref,
  plural,
  PublicationCitation,
  sourceTextHref,
} from "~/components/knowledge-graph";
import type { PaperPageData, PaperSourceText } from "./+data";

const h = hyper.styled(styles);

/** One paper's source texts, on the same frame as the list pages: a sticky
 * header (breadcrumbs, citation, totals, actions) over a scrolling panel of
 * rows. Rows are in memory (the page data), so the panel is used for its
 * frame rather than for paging. Clicking a row opens that paragraph. */
export function Page() {
  const { publication, sourceTexts } = useData<PaperPageData>();

  return h(InfiniteScrollPage, {
    className: "paper-page",
    data: sourceTexts,
    identity: (d: PaperSourceText) => d.id,
    headerElements: h(PaperHeader, { publication, sourceTexts }),
    itemComponent: SourceTextRowCard,
    itemLabel: "source text",
    name: "Source texts",
    enableSelection: SelectionInteractionStyle.NEVER,
    statusBar: false,
    scrollBody: ScrollBody,
  });
}

function sum(rows: PaperSourceText[], key: keyof PaperSourceText): number {
  return rows.reduce((total, row) => total + (Number(row[key]) || 0), 0);
}

function PaperHeader({ publication, sourceTexts }) {
  const reviewed = sourceTexts.filter((d) => d.n_reviews > 0).length;
  return h("div.paper-header", [
    h(PublicationCitation, {
      citation: publication.citation,
      headingLevel: 3,
      showTitle: false,
    }),
    h("div.card-stats", [
      h("span", plural(sourceTexts.length, "source text")),
      h("span", plural(sum(sourceTexts, "n_entities"), "entity", "entities")),
      h("span", plural(sum(sourceTexts, "n_matches"), "match", "matches")),
      h("span", `${reviewed} reviewed`),
    ]),
    h("div.kg-toolbar-group", [
      h(ButtonGroup, { minimal: true }, [
        h(AnchorButton, { icon: "arrow-left", href: `${kgRoot}/papers` }, "Papers"),
        h(
          AnchorButton,
          { icon: "annotation", href: paperSourceTextsHref(publication.paper_id) },
          "In review queue"
        ),
      ]),
      h(AuthStatus, { large: false }),
    ]),
  ]);
}

function SourceTextRowContent({ data, index }: { data: PaperSourceText; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const href = sourceTextHref(data.id);
  const reviewed = data.n_reviews > 0;

  let reviewedTag = null;
  if (reviewed) {
    reviewedTag = h(
      Tag,
      { minimal: true, intent: "success", icon: "tick" },
      plural(data.n_reviews, "review")
    );
  }

  let toggleTitle = "Show full text";
  if (expanded) toggleTitle = "Collapse";

  return h(
    "div.source-text-row",
    { className: classNames({ reviewed }), onClick: openOnClick(href) },
    [
      h("div.source-text-row-main", [
        h("div.source-text-row-header", [
          h("a", { href }, `Text ${index + 1}`),
          h(Identifier, { id: data.id }),
          h("span", formatDate(data.last_update)),
          reviewedTag,
        ]),
        h(
          "p.paragraph-preview",
          { className: classNames({ expanded }) },
          data.paragraph_text
        ),
        h("div.card-stats", [
          h("span", plural(data.n_runs, "run")),
          h("span", plural(data.n_entities, "entity", "entities")),
          h("span", plural(data.n_matches, "match", "matches")),
          h("span", plural(data.n_strat_names, "strat. name")),
        ]),
      ]),
      h("div.source-text-row-aside", [
        h(Button, {
          icon: "more",
          minimal: true,
          small: true,
          title: toggleTitle,
          onClick: () => setExpanded(!expanded),
        }),
      ]),
    ]
  );
}

const SourceTextRowCard = createDataCard<PaperSourceText>(SourceTextRowContent, {
  className: styles["source-text-card"],
});

function ScrollBody({ children }) {
  return h("div.paper-scroll-body", children);
}
