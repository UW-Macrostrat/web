import h from "./components.module.sass";
import { LegacyPublicationList } from "./legacy-publications";

/** The platform papers, kept here until they are published from the Zotero
 * library's Infrastructure collection. */
const infrastructurePapers = [
  {
    citation:
      "Quinn, D.P., C.R. Idzikowski, S.E. Peters. 2024. Building a multi-scale, collaborative, and time-integrated digital crust: The next stage of the Macrostrat data system. Geoscience Data Journal.",
    doi: "10.1002/gdj3.189",
    note: "Macrostrat v2",
  },
  {
    citation:
      "Peters, S.E., J.M. Husson, J. Czaplewski. 2018. Macrostrat: a platform for geological data integration and deep-time Earth crust research. Geochemistry, Geophysics, Geosystems.",
    doi: "10.1029/2018GC007467",
    note: "The platform",
  },
];

export function CiteMacrostrat() {
  return h(
    "ul.cite-list",
    infrastructurePapers.map((p) =>
      h("li.cite-item", { key: p.doi }, [
        h("span.cite-note", p.note),
        h("span.cite-text", p.citation),
        h("a.cite-doi", { href: `https://doi.org/${p.doi}`, target: "_blank", rel: "noopener" }, `doi:${p.doi}`),
      ])
    )
  );
}

export function Bibliography() {
  return h("div.bibliography", h(LegacyPublicationList));
}
