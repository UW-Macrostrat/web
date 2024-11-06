import { useState, useCallback } from "react";

import { ButtonGroup, AnchorButton } from "@blueprintjs/core";
import { PageBreadcrumbs } from "~/components";
import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";
import { IngestTagDisplay } from "#/maps/ingestion/components/ingest-tag-display";
import { ingestPrefix } from "@macrostrat-web/settings";

const h = hyper.styled(styles);

export function Header({
  title,
  sourceURL,
  ingestProcess,
  children,
}: {
  title: string;
  parentRoute?: string;
  sourceURL: string;
  ingestProcess: IngestProcess;
  children?: React.ReactNode;
}) {
  const [_ingestProcess, setIngestProcess] =
    useState<IngestProcess>(ingestProcess);

  const updateIngestProcess = useCallback(async () => {
    const response = await fetch(
      `${ingestPrefix}/ingest-process/${ingestProcess.id}`
    );
    setIngestProcess(await response.json());
  }, []);

  return h("div", [
    h(PageBreadcrumbs),
    h("div.edit-page-header", [
      h("h2", "Map ingestion"),
      h("div", [
        h("h3.map-name", title),
        h(IngestTagDisplay, {
          ingestProcess: ingestProcess,
          onUpdate: () => {},
        }),
      ]),
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
