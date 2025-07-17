import h from "@macrostrat/hyper";

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

  const year = ref_year.length ? " " + ref_year + ", " : "";
  const source = ref_source.length ? ": " + ref_source : "";
  const doiText = isbn_doi?.length ? ", " + isbn_doi : "";

  return h("p.reference.map-source-attr", [
    h('h1', name),
    h('h3', [
      h("span.attr", "Source: "),
      authors,
      year,
      h("a.ref-link", { href: url, target: "_blank" }, [ref_title]),
      source,
      doiText,
      ". ",
      h.if(showSourceID)(
        "a",
        {
          onClick() {
            onClickSourceID?.(source_id);
          },
        },
        source_id
      ),
      h.if(map_id != null)([" / ", map_id]),
    ])
  ]);
}
