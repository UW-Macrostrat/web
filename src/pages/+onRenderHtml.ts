import { onRenderHtml as _onRenderHtml } from "vike-react/renderer/onRenderHtml";
import { updatePageMeta } from "~/renderer/page-meta";

// there is no onBeforeRenderHtml hook in vike-react, so we need to call updatePageMeta here

export function onRenderHtml(pageContext) {
  return _onRenderHtml(updatePageMeta(pageContext));
}
