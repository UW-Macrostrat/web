import h from "@macrostrat/hyper";
import { ReactNode } from "react";
//import { Identifier } from "@macrostrat/column-views";

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
  if (ref_title?.length) {
    mainText.push(
      h(
        "strong.title",
        h("a.ref-link", { href: url, target: "_blank" }, [ref_title])
      )
    );
  }

  if (ref_year?.length) {
    mainText.push(h("span.year", ref_year));
  }
  if (ref_source?.length) {
    mainText.push(h("span.source", ref_source));
  }
  if (isbn_doi?.length) {
    mainText.push(
      h(
        "a.doi-link",
        { href: "https://doi.org/" + isbn_doi, target: "_blank" },
        isbn_doi
      )
    );
  }

  const txt = addSeparators(mainText);

  return h("header.map-source", [h("p.map-reference", txt)]);
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
