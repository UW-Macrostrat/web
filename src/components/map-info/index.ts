import h from "@macrostrat/hyper";
import { ReactNode } from "react";
import { DataField } from "@macrostrat/data-components";
import { Identifier } from "@macrostrat/column-views";

export function MapReference(props) {
  const { reference: ref, showSourceID = true, onClickSourceID = null } = props;
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

  return h(DataField, { label: "Source", inline: true }, [
    h("span.map-reference", txt),
  ]);
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
