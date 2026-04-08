import { useState, useCallback } from "react";

import { ButtonGroup, AnchorButton } from "@blueprintjs/core";
import { PageBreadcrumbs } from "~/components";
import h from "./main.module.sass";
import { IngestTagDisplay } from "../../components/ingest-tag-display";
import { ingestPrefix } from "@macrostrat-web/settings";

export function Header({
  title,
  sourceURL,
  refTitle,
  ingestProcess,
  children,
  separateTitle = true,
}: {
  title: string;
  parentRoute?: string;
  sourceURL: string;
  refTitle?: string;
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

  return h("div.header", [
    h(PageBreadcrumbs, { separateTitle }),
    h("div.edit-page-header", [
      h.if(sourceURL != null)(NavigateMapSourceButton, {
        title: refTitle,
        href: sourceURL,
      }),
      h("div", [
        h(IngestTagDisplay, {
          ingestProcess: ingestProcess,
          onUpdate: () => {},
        }),
      ]),
      h("div.spacer"),
      h(
        ButtonGroup,
        { minimal: true, className: "edit-page-buttons" },
        children
      ),
    ]),
  ]);
}

export function NavigateMapSourceButton({
  href,
  title,
}: {
  href: string;
  title?: string;
}) {
  return h(
    AnchorButton,
    {
      minimal: true,
      rightIcon: "link",
      intent: "primary",
      target: "_blank",
      large: true,
      href: href,
    },
    title ?? "Source"
  );
}
