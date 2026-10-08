import h from "@macrostrat/hyper";
import { Children, ReactNode } from "react";

export function MapReference(props) {
  const { prefix = null, reference: ref, children } = props;
  if (!ref || Object.keys(ref).length === 0) {
    return null;
  }

  const {
    authors,
    ref_year,
    url,
    ref_title,
    ref_source,
    isbn_doi,
    source_id,
    map_id = null,
    name = "",
  } = ref;

  const mainText = [];

  if (authors?.length) {
    mainText.push(h("span.authors", authors));
  }
  if (ref_year?.length) {
    mainText.push(h("span.year", ref_year));
  }

  if (ref_title?.length) {
    mainText.push(
      h(
        "strong.title",
        h("a.ref-link", { href: url, target: "_blank" }, [ref_title])
      )
    );
  }

  if (ref_source?.length) {
    mainText.push(h("span.source", ref_source));
  }
  if (isbn_doi?.length) {
    let prefix = "";
    let doi = isbn_doi;
    let href = null;
    if (doi.startsWith("doi:")) {
      prefix = "doi: ";
      doi = doi.slice(4);
    }
    doi = doi.trim();
    if (doi.startsWith("10.")) {
      href = "https://doi.org/" + doi;
    }
    mainText.push(
      h([prefix, h("a.doi-link", { href, target: "_blank" }, doi)])
    );
    mainText.push(h("a", { href: `/maps/${source_id}` }, h("code", source_id)));
  }

  const txt = addSeparators(mainText);

  return h(BaseMapReference, { prefix }, [txt, children]);
}

/** One of a polygon's references, as API v2 `map_query_v2` returns them. */
export interface MapRef {
  ref_type: string;
  label: string;
  ref_id: number;
  citation: string;
  doi: string | null;
  url: string | null;
}

/** A polygon's references, each under its label ("Original", "Compiled in").
 * A reference in several roles is listed once, its labels joined ("Described in
 * and data from"). `children` (links for the map) follow the first. */
export function MapReferenceList(props: { refs: MapRef[]; children?: ReactNode }) {
  const { refs, children } = props;
  return h(
    mergeRoles(refs).map((entry, i) => {
      let extra = null;
      if (i == 0) extra = children;
      return h(MapRefEntry, { key: entry.ref_id, entry }, extra);
    })
  );
}

/** One entry per reference, in the order each first appears. */
function mergeRoles(refs: MapRef[]): MapRef[] {
  const byRef = new Map<number, { entry: MapRef; labels: string[] }>();
  for (const entry of refs) {
    const seen = byRef.get(entry.ref_id);
    if (seen == null) {
      byRef.set(entry.ref_id, { entry, labels: [entry.label] });
    } else {
      seen.labels.push(entry.label.toLowerCase());
    }
  }
  return Array.from(byRef.values(), ({ entry, labels }) => ({
    ...entry,
    label: joinLabels(labels),
  }));
}

function joinLabels(labels: string[]): string {
  if (labels.length < 2) return labels[0];
  return labels.slice(0, -1).join(", ") + " and " + labels[labels.length - 1];
}

function MapRefEntry(props: { entry: MapRef; children?: ReactNode }) {
  const { entry, children } = props;
  const { label, citation, doi, url } = entry;
  const parts: ReactNode[] = [
    h("span.citation", citation.replace(/[.\s]+$/, "")),
  ];
  if (doi) {
    parts.push(
      h(
        "a.doi-link",
        { href: "https://doi.org/" + doi, target: "_blank" },
        "doi:" + doi
      )
    );
  } else if (url) {
    parts.push(h("a.ref-link", { href: url, target: "_blank" }, "link"));
  }
  return h(BaseMapReference, { prefix: label }, [
    addSeparators(parts, ". "),
    children,
  ]);
}

export function BaseMapReference(props) {
  const { children, prefix = null } = props;
  const _prefix = prefix ? h("em.prefix", [prefix + " "]) : null;
  return h("p.map-reference", [_prefix, ...Children.toArray(children)]);
}

function addSeparators(
  mainText: ReactNode[],
  sep = ", ",
  end = "."
): ReactNode[] {
  const result: ReactNode[] = [];
  mainText.forEach((val, i) => {
    result.push(val);
    if (i < mainText.length - 1) {
      result.push(sep);
    }
  });
  if (mainText.length > 0) {
    result.push(end);
  }
  return result;
}
