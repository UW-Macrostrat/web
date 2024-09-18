import { JSONView } from "@macrostrat/ui-components";
import { usePageContext } from "vike-react/usePageContext";
import h from "@macrostrat/hyper";

export function DevToolsData() {
  const pageContext = usePageContext();

  return h(JSONView, { data: pageContext, showRoot: false });
}
