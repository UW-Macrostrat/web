import { onRenderHtml as _onRenderHtml } from "vike-react/__internal/integration/onRenderHtml";
import { updatePageMeta } from "~/renderer/updatePageMeta";

// there is no onBeforeRenderHtml hook in vike-react, so we need to call updatePageMeta here to rewrite titles etc.
// There might be a better way to handle this.

export function onRenderHtml(pageContext) {
  return _onRenderHtml(updatePageMeta(pageContext));
}
