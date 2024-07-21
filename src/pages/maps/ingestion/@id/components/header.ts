import { ButtonGroup, AnchorButton } from "@blueprintjs/core";
import { PageBreadcrumbs } from "~/components";
import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

export function Header({
  title,
  sourceURL,
  children,
}: {
  title: string;
  parentRoute?: string;
  sourceURL: string;
  children?: React.ReactNode;
}) {
  return h("div", [
    h(PageBreadcrumbs),
    h("div.edit-page-header", [
      h("h2", "Map ingestion"),
      h("h3.map-name", title),
      h("div.spacer"),
      h(ButtonGroup, { minimal: true, className: "edit-page-buttons" }, [
        h.if(sourceURL != null)(NavigateMapSourceButton, {
          href: sourceURL,
        }),
        children,
      ]),
    ]),
  ]);
}

function NavigateMapSourceButton({ href }: { href: string }) {
  return h(
    AnchorButton,
    {
      minimal: true,
      title: "Source",
      icon: "link",
      intent: "primary",
      target: "_blank",
      large: true,
      href: href,
    },
    "Source"
  );
}
