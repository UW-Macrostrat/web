import h from "@macrostrat/hyper";
import { resolvePattern } from "~/_utils";
import { GeologicPatternProvider } from "@macrostrat/column-components";
// Import the pattern provider if on the client side
// This is a wrapper around the GeologicPatternProvider from column-components

export function PatternProvider({ children }) {
  console.log("Resolve pattern");
  return h(GeologicPatternProvider, { resolvePattern }, children);
}
