import h from "./main.module.sass";
import { AnchorButton, ButtonGroup, HTMLSelect } from "@blueprintjs/core";
import { Header } from "./components";
import { MapInterface } from "./components";
import { usePageProps } from "~/renderer/usePageProps";
import { useState } from "react";
import { Allotment } from "allotment";
import { MapSelectedFeatures } from "./details-panel";
import { useData } from "vike-react/useData";
import "allotment/dist/style.css";
import { postgrestPrefix } from "@macrostrat-web/settings";

const VALID_INGEST_STATES = [
  "ready",
  "pre-processed",
  "prepared",
  "post-processed",
  "post_harmonization",
  "pending",
  "needs review",
  "ingested",
  "finalized",
  "failed",
  "abandoned",
];

interface EditInterfaceProps {
  title?: string;
  parentRoute?: string;
  source_id?: number;
  mapBounds?: any;
  source?: any;
  ingestProcess?: any;
}

export function Page() {
  const { source_id, source, ingestProcess }: EditInterfaceProps =
    usePageProps();
  const [currentIngestProcess, setCurrentIngestProcess] = useState(ingestProcess);
  const [ingestState, setIngestState] = useState<string>(
    ingestProcess?.state ?? ""
  );

  const data = useData();
  const { mapInfo, geometry } = data;

  const headerProps = {
    ingestProcess: currentIngestProcess,
    title: mapInfo.name,
    identifier: mapInfo.source_id,
    slug: mapInfo.slug,
    sourceURL: source.url,
    refTitle: mapInfo.ref_title ?? mapInfo.name,
  };

  const basename = `/maps/ingestion/${source_id}`;

  const [mapSelectedFeatures, selectFeatures] = useState([]);
  const [inspectPosition, setInspectPosition] = useState(null);

  const showSelectedFeatures =
    mapSelectedFeatures != null && mapSelectedFeatures.length > 0;

  const mapBounds = {
    geometry,
    properties: mapInfo,
  };

  return h("div.page", [
    // TODO: make this header part of a layout component once we've figured out its semantics
    h("div", { style: { position: "relative" } }, [
    h(Header, headerProps),
    h(StatusDropdown, {
      ingestProcessId: ingestProcess?.id,
      sourceId: source_id,
      value: ingestState,
      onChange: setIngestState,
      onUpdateIngestProcess: setCurrentIngestProcess,
    }),
    ]),
    h("div.ingestion-main-panel", [
      h("div.context-panel", [h(EditMenu, { parentRoute: basename })]),
      h(Allotment, { className: "main-panel", defaultSizes: [800, 300] }, [
        h(MapInterface, {
          map: mapBounds,
          slug: source.slug,
          onClickFeatures: selectFeatures,
          selectedFeatures: mapSelectedFeatures,
          inspectPosition,
          setInspectPosition,
          className: "map-container",
        }),
        h(Allotment.Pane, { visible: showSelectedFeatures }, [
          h(MapSelectedFeatures, {
            features: mapSelectedFeatures,
            onClose() {
              selectFeatures([]);
              setInspectPosition(null);
            },
            selectFeatures,
            className: "details-panel",
          }),
        ]),
      ]),
    ]),
  ]);
}



function StatusDropdown({
  ingestProcessId,
  sourceId,
  value,
  onChange,
  onUpdateIngestProcess,
}: {
  ingestProcessId?: number;
  sourceId?: number;
  value: string;
  onChange: (value: string) => void;
  onUpdateIngestProcess: (ingestProcess: any) => void;

}) {
  const [draftValue, setDraftValue] = useState<string>(value ?? "");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const updateStatus = async () => {
    if (draftValue === "") return;

    const idFilter =
      ingestProcessId != null
        ? `id=eq.${ingestProcessId}`
        : `source_id=eq.${sourceId}`;

    setIsSubmitting(true);

    const response = await fetch(`${postgrestPrefix}/map_ingest?${idFilter}`, {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({ state: draftValue }),
    });
    setIsSubmitting(false);
    if (!response.ok) {
      const text = await response.text();
      console.error("Failed to update ingest state", response.status, text);
      return;
    }

    const updatedRows = await response.json();
    const updatedIngestProcess = updatedRows?.[0];
    if (updatedIngestProcess != null) {
      onUpdateIngestProcess(updatedIngestProcess);
      onChange(updatedIngestProcess.state);
    } else {
      onChange(draftValue);
    }

    onChange(draftValue);
  };

  return h(
    "div",
    {
      style: {
        position: "absolute",
        top: "0.75rem",
        right: "1rem",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        zIndex: 10,
      },
    },
    [
      h("span", { style: { fontWeight: 600 } }, "Status"),
      h(HTMLSelect, {
        value: draftValue,
        options: [
          { label: "Select status", value: "" },
          ...VALID_INGEST_STATES.map((state) => ({
            label: state,
            value: state,
          })),
        ],
        onChange: (event) => {
          setDraftValue(event.currentTarget.value);
        },
      }),
      h(AnchorButton, {
        text: isSubmitting ? "Saving..." : "Submit",
        intent: draftValue !== value ? "primary" : "none",
        disabled: draftValue === "" || isSubmitting || draftValue === value,
        onClick: updateStatus,
        small: true,
      }),
    ]
  );
}

function EditMenu({ parentRoute }) {
  return h(
    ButtonGroup,
    { className: "edit-menu", vertical: true, large: true },
    [
      h(
        AnchorButton,
        {
          icon: "edit",
          large: true,
          href: parentRoute + "/meta",
        },
        "Metadata"
      ),
      h(
        AnchorButton,
        {
          icon: "polygon-filter",
          large: true,
          href: parentRoute + "/polygons",
        },
        "Polygons"
      ),
      h(
        AnchorButton,
        {
          icon: "minus",
          large: true,
          href: parentRoute + "/lines",
        },
        "Lines"
      ),
      h(
        AnchorButton,
        {
          icon: "selection",
          large: true,
          href: parentRoute + "/points",
        },
        "Points"
      ),
      h(
        ShowDocsButton,
        {
          href: "/docs/ingestion",
        },
        "Documentation"
      ),
    ]
  );
}

function ShowDocsButton({ href, children }: { href: string }) {
  return h(
    AnchorButton,
    {
      minimal: true,
      title: "Ingestion Documentation",
      icon: "manual",
      target: "_blank",
      large: true,
      href,
    },
    children
  );
}
