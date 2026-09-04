/** Server-safe display components for the extraction and feedback pages:
 * citations, run metadata, list cards, and the header toolbar. Nothing here
 * touches the browser, so pages can render them during SSR. */
import hyper from "@macrostrat/hyper";
import styles from "./knowledge-graph.module.sass";
import { AnchorButton, Tag } from "@blueprintjs/core";
import { Identifier } from "@macrostrat/data-components";
import { DataField } from "@macrostrat/ui-components";
import { createDataCard } from "@macrostrat/data-sheet";
import type { ReactNode } from "react";
import type {
  KGCitation,
  KGCitationIdentifier,
  KGFeedbackNote,
  KGModel,
  KGPublication,
  KGRun,
  KGSourceText,
} from "./types";

const h = hyper.styled(styles);

// ---- Routes ---------------------------------------------------------------
// Every internal link to the extraction pages is built here, so a route change
// is a one-line edit and no page composes hrefs from `urlPathname` or with
// relative paths.

export const kgRoot = "/ext/kg";

export function paperHref(paperId: string) {
  return `${kgRoot}/papers/${encodeURIComponent(paperId)}`;
}

export function sourceTextHref(id: number) {
  return `${kgRoot}/source-texts/${id}`;
}

/** Reviewer-corrected runs for a source text. */
export function reviewsHref(id: number) {
  return `${sourceTextHref(id)}/reviews`;
}

/** The source-text queue, filtered to one paper. */
export function paperSourceTextsHref(paperId: string) {
  return `${kgRoot}/source-texts?paper=${encodeURIComponent(paperId)}`;
}

// ---- Page chrome ----------------------------------------------------------

/** A row of page-level actions under the layout's breadcrumbs: navigation on
 * the left, account status on the right. */
export function KGToolbar({
  children,
  right,
}: {
  children?: ReactNode;
  right?: ReactNode;
}) {
  return h("div.kg-toolbar", [
    h("div.kg-toolbar-group", children),
    h("div.kg-toolbar-group", right),
  ]);
}

// ---- Citations ------------------------------------------------------------

function bestIdentifier(
  identifiers: KGCitationIdentifier[] | null | undefined
): KGCitationIdentifier | null {
  if (identifiers == null || identifiers.length === 0) return null;
  return identifiers.find((d) => d.type === "doi") ?? identifiers[0];
}

function IdentifierLink({ identifier }: { identifier: KGCitationIdentifier }) {
  const { type, id } = identifier;
  let ident: ReactNode = h("code.bp6-code", id);
  if (type === "doi") {
    ident = h("a", { href: `https://doi.org/${id}`, target: "_blank" }, ident);
  }
  return h("p.citation-identifier", [h("span.identifier-label", type), ident]);
}

export function PublicationCitation({
  citation,
  href,
  headingLevel = 2,
  showTitle = true,
}: {
  citation: KGCitation | null | undefined;
  /** Link the title to this page (omit on the paper's own page). */
  href?: string;
  headingLevel?: number;
  /** Set false where the layout already shows the title (the paper page). */
  showTitle?: boolean;
}) {
  const title = citation?.title ?? "Untitled publication";
  let titleNode: ReactNode = title;
  if (href != null) {
    titleNode = h("a", { href }, title);
  }
  let titleElement = null;
  if (showTitle) {
    titleElement = h(`h${headingLevel}.citation-title`, titleNode);
  }
  const authors = citation?.author?.map((d) => d.name).filter(Boolean) ?? [];
  const identifier = bestIdentifier(citation?.identifier);

  let journal = null;
  if (citation?.journal != null) {
    let year = "";
    if (citation.year != null) year = ` (${citation.year})`;
    journal = h("p.citation-journal", citation.journal + year);
  }

  return h("div.citation", [
    titleElement,
    journal,
    h.if(authors.length > 0)("p.citation-authors", authors.join(", ")),
    h.if(identifier != null)(IdentifierLink, { identifier }),
  ]);
}

// ---- Runs -----------------------------------------------------------------

/** `plural(2, "match", "matches")` → "2 matches". */
export function plural(count: number, singular: string, pluralForm?: string) {
  let word = pluralForm ?? singular + "s";
  if (count === 1) word = singular;
  return `${count} ${word}`;
}

export function formatDate(value: string | null | undefined) {
  if (value == null) return null;
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Model, run, and version identifiers for one run. */
export function RunMeta({ run, model }: { run: KGRun; model?: KGModel }) {
  let version = null;
  if (run.version_id != null) version = `#${run.version_id}`;
  return h("div.run-meta", [
    h(DataField, { label: "Model", value: model?.name ?? `#${run.model_id}`, inline: true }),
    h(DataField, { label: "Run", value: `#${run.model_run}`, inline: true }),
    h(DataField, { label: "Version", value: version, inline: true }),
  ]);
}

/** The note and categories a reviewer attached to a feedback run. */
export function FeedbackNotesView({ notes }: { notes: KGFeedbackNote | null }) {
  if (notes == null) return null;
  const hasNote = notes.note != null && notes.note.trim().length > 0;
  return h("div.feedback-notes", [
    h("h4", ["Reviewer notes", " ", h("span.bp6-text-muted", formatDate(notes.date))]),
    h.if(notes.types.length > 0)(
      "div.kg-toolbar-group",
      notes.types.map((t) => h(Tag, { key: t.type_id, minimal: true }, t.type))
    ),
    h.if(hasNote)("p", notes.note),
  ]);
}

// ---- List cards -----------------------------------------------------------

function PaperCardContent({ data }: { data: KGPublication }) {
  const href = paperHref(data.paper_id);
  let matches = null;
  if (data.n_matches != null) {
    matches = h(Tag, { minimal: true, icon: "link" }, [
      plural(data.n_matches, "stratigraphic name match", "stratigraphic name matches"),
    ]);
  }
  return h("div.paper-card-content", [
    h(PublicationCitation, { citation: data.citation, href, headingLevel: 3 }),
    h("div.card-footer", [matches, h(AnchorButton, { href, minimal: true, small: true, rightIcon: "arrow-right" }, "Extractions")]),
  ]);
}

export const PaperCard = createDataCard<KGPublication>(PaperCardContent, {
  className: styles["paper-card"],
});

function SourceTextCardContent({ data }: { data: KGSourceText }) {
  const href = sourceTextHref(data.id);
  return h("div.source-text-card-content", [
    h("div.card-title", [
      h("h3", h("a", { href }, `Source text`)),
      h(Identifier, { id: data.id }),
    ]),
    h("p.paragraph-preview", data.paragraph_text),
    h("div.card-stats", [
      h(DataField, { label: "Runs", value: data.n_runs, inline: true }),
      h(DataField, { label: "Entities", value: data.n_entities, inline: true }),
      h(DataField, { label: "Matches", value: data.n_matches, inline: true }),
      h(DataField, { label: "Strat. names", value: data.n_strat_names, inline: true }),
    ]),
    h("div.card-footer", [
      h("span", formatDate(data.last_update)),
      h(AnchorButton, { href, minimal: true, small: true, rightIcon: "arrow-right" }, "Review"),
    ]),
  ]);
}

export const SourceTextCard = createDataCard<KGSourceText>(
  SourceTextCardContent,
  { className: styles["source-text-card"] }
);
