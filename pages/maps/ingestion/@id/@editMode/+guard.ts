import { render } from "vike/abort";
import type { PageContext } from "vike/types";

const validEditModes = ["points", "lines", "polygons"];

// The @editMode route segment is greedy, so asset probes like
// `/maps/ingestion/3388/installHook.js.map` (React DevTools source maps)
// land here too. Reject anything that isn't a real edit mode with a proper
// 404 instead of letting it fall through to the page renderer.
export default function guard(pageContext: PageContext) {
  const { editMode } = pageContext.routeParams;
  if (!validEditModes.includes(editMode)) {
    throw render(404, "Invalid edit mode");
  }
}
