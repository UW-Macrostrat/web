/** The selected reference's geometry diagnostics, and the map settings. */
import { Callout } from "@blueprintjs/core";
import { ExpansionPanel } from "@macrostrat/data-components";
import hyper from "@macrostrat/hyper";
import { useAtom, useAtomValue } from "jotai";

import { BaseLayerForm } from "~/components";
import { basemapAtom, showLabelsAtom } from "~/_utils/basemap";

import { problemsOf, type Reference } from "./api";
import { selectedRefAtom } from "./state";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

export function RefAssistant() {
  return h("div.ref-assistant", [h(RefDetails), h(MapOptions)]);
}

function RefDetails() {
  const ref = useAtomValue(selectedRefAtom);
  if (ref == null) {
    return h("p.hint", "Select a reference to see its geometry.");
  }

  return h(
    ExpansionPanel,
    { title: `Reference #${ref.id}`, expanded: true },
    [
      h("p.citation", [`${ref.author} (${ref.pub_year}). ${ref.ref}`]),
      h(DoiLink, { ref_: ref }),
      h(ProblemCallouts, { ref_: ref }),
      h(GeometryFacts, { ref_: ref }),
    ]
  );
}

function DoiLink({ ref_ }) {
  const ref: Reference = ref_;
  if (ref.doi == null) return null;
  return h("p.citation", h("a", { href: `https://doi.org/${ref.doi}` }, ref.doi));
}

function ProblemCallouts({ ref_ }) {
  const ref: Reference = ref_;
  const problems = problemsOf(ref).filter((p) => p.intent !== "none");
  return h(
    problems.map((p) => {
      let detail = null;
      if (p.label === "Invalid") detail = h("code", ref.invalid_reason);
      return h(Callout, { key: p.label, intent: p.intent, title: p.label, className: "problem" }, detail);
    })
  );
}

function GeometryFacts({ ref_ }) {
  const ref: Reference = ref_;
  if (ref.geom_type == null) {
    return h("p.hint", "No geometry.");
  }
  const bbox = ref.bbox?.map((v) => v.toFixed(2)).join(", ");

  return h("dl.facts", [
    h("dt", "Type"),
    h("dd", ref.geom_type),
    h("dt", "Vertices"),
    h("dd", ref.n_points?.toLocaleString()),
    h("dt", "SRID"),
    h("dd", ref.srid),
    h("dt", "Bounds"),
    h("dd", bbox),
    h("dt", "Strat names"),
    h("dd", ref.n_strat_names.toLocaleString()),
  ]);
}

function MapOptions() {
  const [basemap, setBasemap] = useAtom(basemapAtom);
  const [showLabels, setShowLabels] = useAtom(showLabelsAtom);
  return h(
    ExpansionPanel,
    { title: "Map layers", className: "map-options" },
    h(BaseLayerForm, { basemap, setBasemap, showLabels, setShowLabels })
  );
}
