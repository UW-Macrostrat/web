import hyper from "@macrostrat/hyper";
import { ContentPage } from "~/layouts";
import { Link, PageHeader } from "~/components";
import { AttributedLithTag } from "~/components";
import { AnchorButton, Icon, InputGroup, Tag } from "@blueprintjs/core";
import { GDDReferenceCard, CollapseCard } from "@macrostrat/ui-components";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

export function Page({ data, relationships }) {
  return h(ContentPage, [
    h(PageHeader, { title: "Stratigraphic names" }),
    h(StratNamesView, { data }),
    h.if(relationships.length > 0)(RelationshipsView, { relationships }),
  ]);
}

function StratNamesView({ data }) {
  return h(StratNamesList, { data });
}

function StratNamesList({ data }) {
  return h("div.strat-names-list", [
    data.map((d) => h(StratNameItem, { data: d })),
  ]);
}

const ranks = {
  Fm: "Formation",
  Mbr: "Member",
  Gp: "Group",
  Sgp: "Supergroup",
};

function StratNameItem({ data }) {
  const { kg_liths, liths, units } = data;
  return h("div.strat-name", {}, [
    h("div.strat-name-header.flex.row", [
      h("h2.strat-name", [
        data.strat_name,
        " ",
        h("span", ranks[data.rank] ?? data.rank),
      ]),
    ]),
    h("nav.flex.row", [
      h(
        AnchorButton,
        {
          href: `/lex/strat-names`,
          icon: "arrow-left",
          minimal: true,
        },
        "Back to list"
      ),
      h("p", [
        `in ${units.length} columns`,
        ": ",
        units.map((d, i) => {
          const sep = i === units.length - 1 ? "" : ", ";
          return h([
            h(Link, { href: `/columns/${d.col_id}#unit=${d.id}` }, d.col_id),
            sep,
          ]);
        }),
      ]),
    ]),
    h("div.strat-name-details", [h("h3", "Lithologies"), h(Liths, { liths })]),
    h.if(kg_liths != null)("div.strat-name-details", [
      h("h3", "Candidate lithologies"),
      h(Liths, { liths: kg_liths, candidate: true }),
    ]),
  ]);
}

function Liths({ liths, candidate = false }) {
  return h(
    "p.liths",
    liths.map((lith, i) => {
      return h(AttributedLithTag, { key: i, lith, candidate });
    })
  );
}

function RelationshipsView({ relationships }) {
  return h("div.relationships", [
    h("h2", "Candidate lithology extractions"),
    relationships.map((d) => h(RelationshipItem, { data: d })),
  ]);
}

type Relationship = {
  head: string;
  tail: string;
  head_pos: number;
  tail_pos: number;
  paragraph_txt: string;
  article_id: string;
  strat_name_implicit: boolean;
  strat_name_correct?: boolean;
  search_strat_name: string;
  lith: any;
};

function RelationshipItem({ data }: { data: Relationship }) {
  const { head, tail, head_pos, tail_pos, lith } = data;

  let highlights: Highlight[] = [];

  let ssn = data.search_strat_name.toLowerCase();
  let txt = data.paragraph_txt.toLowerCase();
  let start = txt.indexOf(ssn);
  if (start != -1) {
    highlights.push({
      start,
      end: start + ssn.length,
      backgroundColor: "lightgray",
    });
  }

  if (head_pos != null) {
    let start = head_pos;
    let end = head_pos + head.length;
    highlights.push({ start, end, backgroundColor: "lightgray" });
  }

  if (tail_pos != null) {
    let start = tail_pos;
    let end = tail_pos + tail.length;
    highlights.push({ start, end, backgroundColor: "lightgray" });
  }

  return h("div.relationship-item", [
    h("div.relationship-header.flex.row", [
      h(AttributedLithTag, { lith, candidate: true }),
      h("p.relationship", [
        head,
        " ",
        h(Icon, { icon: "arrow-right" }),
        " ",
        tail,
      ]),
      h("div.spacer"),
      h("p", [h(LinkStatus, { data })]),
    ]),
    h(CollapseCard, { isOpen: true, className: "source-info" }, [
      h("p", h(HighlightedText, { text: data.paragraph_txt, highlights })),
      h(GDDReferenceCard, { docid: data.article_id, wrapper: Para }),
    ]),
  ]);
}

function Para({ href, docid, ...rest }) {
  return h("p.reference", rest);
}

function LinkStatus({ data }) {
  const correct = data.strat_name_correct;
  if (correct != null && !correct) {
    return h(
      Tag,
      { minimal: true, intent: "danger" },
      "Relevance incorrectly inferred"
    );
  }
  if (data.strat_name_implicit) {
    return h(
      Tag,
      { minimal: true, intent: "warning" },
      "Relevance inferred from proximity"
    );
  }
  return h(
    Tag,
    { minimal: true, intent: "success" },
    "Stratigraphic name explicitly linked"
  );
}

type Highlight = {
  start: number;
  end: number;
  backgroundColor?: string;
  borderColor?: string;
};

function HighlightedText(props: { text: string; highlights: Highlight[] }) {
  const { text, highlights } = props;
  const parts = [];
  let start = 0;

  const sortedHighlights = highlights.sort((a, b) => a.start - b.start);
  const deconflictedHighlights = sortedHighlights.map((highlight, i) => {
    if (i === 0) return highlight;
    const prev = sortedHighlights[i - 1];
    if (highlight.start < prev.end) {
      highlight.start = prev.end;
    }
    return highlight;
  });

  for (const highlight of deconflictedHighlights) {
    const { start: s, end, ...rest } = highlight;
    parts.push(text.slice(start, s));
    parts.push(h("span.highlight", { style: rest }, text.slice(s, end)));
    start = end;
  }
  parts.push(text.slice(start));
  return h("span", parts);
}
