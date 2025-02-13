import h from "@macrostrat/hyper";
import { CarbonIsotopesApp } from "@macrostrat/column-views";
import { PatternProvider } from "~/_providers.client";

export function Page() {
  return h(PatternProvider, h(CarbonIsotopesApp));
}
