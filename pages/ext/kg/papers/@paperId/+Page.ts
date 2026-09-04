import hyper from "@macrostrat/hyper";
import styles from "~/components/knowledge-graph/knowledge-graph.module.sass";
import { useData } from "vike-react/useData";
import { useState } from "react";
import {
  AnchorButton,
  Button,
  ButtonGroup,
  NonIdealState,
  Tag,
} from "@blueprintjs/core";
import { AuthStatus } from "@macrostrat/form-components";
import { Identifier } from "@macrostrat/data-components";
import classNames from "classnames";
import {
  formatDate,
  KGToolbar,
  type KGSourceText,
  paperSourceTextsHref,
  plural,
  PublicationCitation,
  sourceTextHref,
  kgRoot,
} from "~/components/knowledge-graph";
import type { PaperPageData } from "./+data";

const h = hyper.styled(styles);

/** Summary of one paper's extractions: the citation, totals, and one row per
 * source text that descends into that paragraph's view/editor. The layout
 * (`pageStyle: "content"`) owns breadcrumbs, title, and footer. */
export function Page() {
  const { publication, sourceTexts, humanRunCounts } =
    useData<PaperPageData>();

  return h([
    h(KGToolbar, { right: h(AuthStatus, { large: false }) }, [
      h(ButtonGroup, { minimal: true }, [
        h(
          AnchorButton,
          { icon: "arrow-left", href: `${kgRoot}/papers` },
          "All papers"
        ),
        h(
          AnchorButton,
          {
            icon: "annotation",
            href: paperSourceTextsHref(publication.paper_id),
          },
          "Open in review queue"
        ),
      ]),
    ]),
    h(PublicationCitation, {
      citation: publication.citation,
      headingLevel: 2,
      showTitle: false,
    }),
    h(PaperSummary, { sourceTexts, humanRunCounts }),
    h(SourceTextList, { sourceTexts, humanRunCounts }),
  ]);
}

function sum(rows: KGSourceText[], key: keyof KGSourceText): number {
  return rows.reduce((total, row) => total + (Number(row[key]) || 0), 0);
}

function PaperSummary({ sourceTexts, humanRunCounts }) {
  const reviewed = sourceTexts.filter((d) => humanRunCounts[d.id] > 0).length;
  return h("div.paper-summary", [
    h("span", plural(sourceTexts.length, "source text")),
    h("span", plural(sum(sourceTexts, "n_entities"), "entity", "entities")),
    h("span", plural(sum(sourceTexts, "n_matches"), "lexicon match", "lexicon matches")),
    h("span", `${reviewed} reviewed`),
  ]);
}

function SourceTextList({ sourceTexts, humanRunCounts }) {
  if (sourceTexts.length === 0) {
    return h(NonIdealState, {
      icon: "search-text",
      title: "No extractions yet",
      description: "No model has been run over this paper's text.",
    });
  }
  return h(
    "div.source-text-list",
    sourceTexts.map((sourceText: KGSourceText, i: number) =>
      h(SourceTextRow, {
        key: sourceText.id,
        sourceText,
        position: i + 1,
        humanRuns: humanRunCounts[sourceText.id] ?? 0,
      })
    )
  );
}

function SourceTextRow({
  sourceText,
  position,
  humanRuns,
}: {
  sourceText: KGSourceText;
  position: number;
  humanRuns: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const href = sourceTextHref(sourceText.id);
  const reviewed = humanRuns > 0;

  let reviewedTag = null;
  if (reviewed) {
    reviewedTag = h(
      Tag,
      { minimal: true, intent: "success", icon: "tick" },
      plural(humanRuns, "review")
    );
  }

  let toggleLabel = "Show full text";
  if (expanded) toggleLabel = "Collapse";

  return h("div.source-text-row", { className: classNames({ reviewed }) }, [
    h("div.source-text-row-main", [
      h("div.source-text-row-header", [
        h("span", `Text ${position}`),
        h(Identifier, { id: sourceText.id }),
        h("span", formatDate(sourceText.last_update)),
      ]),
      h(
        "p.paragraph-preview",
        { className: classNames({ expanded }) },
        sourceText.paragraph_text
      ),
      h("div.card-stats", [
        h("span", plural(sourceText.n_runs, "run")),
        h("span", plural(sourceText.n_entities, "entity", "entities")),
        h("span", plural(sourceText.n_matches, "match", "matches")),
        h("span", plural(sourceText.n_strat_names, "strat. name")),
      ]),
    ]),
    h("div.source-text-row-aside", [
      reviewedTag,
      h(ButtonGroup, { minimal: true }, [
        h(
          Button,
          { small: true, onClick: () => setExpanded(!expanded) },
          toggleLabel
        ),
        h(
          AnchorButton,
          { small: true, intent: "primary", rightIcon: "arrow-right", href },
          "Open"
        ),
      ]),
    ]),
  ]);
}
