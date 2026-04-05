import h from "@macrostrat/hyper";
import "allotment/dist/style.css";
import { usePageContext } from "vike-react/usePageContext";

export function Page() {
  const { urlPathname } = usePageContext();

  return h("ul.links", [
    h("li", h("a", { href: urlPathname + "/legacy" }, "Legacy interface")),
    h("li", h("a", { href: urlPathname + "/next" }, "Next interface")),
  ]);
}
