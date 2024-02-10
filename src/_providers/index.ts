import { GeologicPatternProvider } from "@macrostrat/column-components";
import h from "@macrostrat/hyper";
import { resolvePattern } from "~/_utils";

export function PatternProvider({ children }) {
  return h(GeologicPatternProvider, { resolvePattern }, children);
}
