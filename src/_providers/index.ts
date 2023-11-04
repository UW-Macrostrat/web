import { GeologicPatternProvider } from "@macrostrat/column-components";
import h from "@macrostrat/hyper";

function resolvePattern(name: string | number) {
  return `//visualization-assets.s3.amazonaws.com/geologic-patterns/svg/${name}.svg`;
}

export function PatternProvider({ children }) {
  return h(GeologicPatternProvider, { resolvePattern }, children);
}
