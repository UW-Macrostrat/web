import { Dialog } from "@blueprintjs/core";
import { JSONView } from "@macrostrat/ui-components";
import { usePageContext } from "vike-react/usePageContext";
import h from "./page-admin.module.sass";

export function PageAdminInner({ isOpen, setIsOpen }) {
  return h([
    h(
      Dialog,
      {
        isOpen,
        onClose: () => setIsOpen(false),
        title: "Page info",
        className: "page-admin",
      },
      h("div.dialog-content.bp5-dialog-content", [h(PageContextViewer)])
    ),
    h("span.__render_alarm__"),
  ]);
}

function PageContextViewer() {
  return h(JSONView, { data: usePageContext(), hideRoot: true });
}
