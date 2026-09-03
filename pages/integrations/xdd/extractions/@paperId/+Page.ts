import hyper from "@macrostrat/hyper";
import styles from "~/components/knowledge-graph/knowledge-graph.module.sass";
import { useData } from "vike-react/useData";
import { AnchorButton, ButtonGroup, NonIdealState } from "@blueprintjs/core";
import { AuthStatus } from "@macrostrat/form-components";
import { Identifier } from "@macrostrat/data-components";
import {
  ExtractionViewClient,
  KGToolbar,
  type KGRun,
  paperSourceTextsHref,
  plural,
  PublicationCitation,
  sourceTextHref,
  xddRoot,
} from "~/components/knowledge-graph";
import type { PaperPageData } from "./+data";

const h = hyper.styled(styles);

/** All model extractions for one paper, grouped by source text. The layout
 * (`pageStyle: "content"`) owns breadcrumbs, title, and footer. */
export function Page() {
  const { publication, runs, lookups } = useData<PaperPageData>();

  return h([
    h(KGToolbar, { right: h(AuthStatus, { large: false }) }, [
      h(ButtonGroup, { minimal: true }, [
        h(
          AnchorButton,
          { icon: "arrow-left", href: `${xddRoot}/extractions` },
          "All papers"
        ),
        h(
          AnchorButton,
          {
            icon: "annotation",
            href: paperSourceTextsHref(publication.paper_id),
          },
          "Review source texts"
        ),
      ]),
    ]),
    h(PublicationCitation, {
      citation: publication.citation,
      headingLevel: 2,
      showTitle: false,
    }),
    h(SourceTextSections, { runs, lookups }),
  ]);
}

function groupBySourceText(runs: KGRun[]): Map<number, KGRun[]> {
  const groups = new Map<number, KGRun[]>();
  for (const run of runs) {
    const list = groups.get(run.source_text) ?? [];
    list.push(run);
    groups.set(run.source_text, list);
  }
  return groups;
}

function SourceTextSections({ runs, lookups }) {
  if (runs.length === 0) {
    return h(NonIdealState, {
      icon: "search-text",
      title: "No extractions yet",
      description: "No model has been run over this paper's text.",
    });
  }
  const groups = groupBySourceText(runs);
  return h(
    "div.source-text-sections",
    Array.from(groups.entries(), ([sourceTextId, textRuns]) =>
      h(SourceTextSection, { key: sourceTextId, sourceTextId, runs: textRuns, lookups })
    )
  );
}

function SourceTextSection({ sourceTextId, runs, lookups }) {
  const runLabel = plural(runs.length, "model run");
  return h("section.source-text-body", [
    h("div.run-header", [
      h("h3", ["Source text ", h(Identifier, { id: sourceTextId })]),
      h("div.kg-toolbar-group", [
        h("span.bp6-text-muted", runLabel),
        h(
          AnchorButton,
          {
            href: sourceTextHref(sourceTextId),
            icon: "edit",
            minimal: true,
            small: true,
          },
          "Give feedback"
        ),
      ]),
    ]),
    h(ExtractionViewClient, {
      runs,
      models: lookups.models,
      entityTypes: lookups.entityTypes,
    }),
  ]);
}
