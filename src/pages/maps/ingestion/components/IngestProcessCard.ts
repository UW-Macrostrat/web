import { AnchorButton, Button, ButtonProps, Card } from "@blueprintjs/core";
import { ComponentType, HTMLAttributes, ReactNode, useCallback, useState } from "react";

import { ingestPrefix } from "@macrostrat-web/settings";
import hyper from "@macrostrat/hyper";
import styles from "./ingest-process-card.module.sass";
import AddButton from "~/pages/maps/ingestion/components/AddButton";
import Tag from "./Tag"

const h = hyper.styled(styles);


const deleteTag = async (tag: string, ingestId: number) => {

  const response = await fetch(
    `${ingestPrefix}/ingest-process/${ingestId}/tags/${tag}`,
    {
      method: "DELETE",
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    }
  )

  if(response.ok){
    return
  } else {
    console.log("error", response)
  }

}

const IngestProcessCard = ({
  ingestProcess,
  user
}: {
  ingestProcess: IngestProcess,
  user: any | undefined;
}) => {

  const [_ingestProcess, setIngestProcess] = useState<IngestProcess>(ingestProcess)

  const updateIngestProcess = useCallback(async () => {
    const response = await fetch(`${ingestPrefix}/ingest-process/${ingestProcess.id}`);
    setIngestProcess(await response.json());
  }, [])

  const {id, tags} = _ingestProcess;
  const { slug, name, source_id, scale, raster_url } = _ingestProcess.source;
  const edit_href = `/maps/ingestion/${source_id}`;
  const sourcesRecordURL = `/map/dev/sources/${slug}`;

  return h(
    Card,
    {
      interactive: true,
      style: {
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        padding: "0.5em",
        margin: "0.5em",
        borderRadius: "0.5em",
        backgroundColor: "#f0f0f0",
        overflow: "scroll"
      },
    },
    [
      h("div", {
        style: {
          maxWidth: "90%"
        }
      }, [
        h("div.flex.row",
          { style: { paddingBottom: "4px" } },
          [
          h(
            "h3",
            { style: { margin: "0px"} },
            name
          ),
          h("div.spacer"),
          h("code", slug),
        ]),
        h("div.flex.row",
          { style: { paddingBottom: "4px", display: "flex", gap: "0.5em" } },
          [
            tags.map((tag, i) => {
              return h(Tag, {
                key: tag,
                value: tag,
                style: {marginTop: "auto", marginBottom: "auto"},
                onClick: async () => {
                  await updateIngestProcess()
                  await deleteTag(tag, id)
                }
              })
            }),
            h(AddButton, {
              ingestId: id,
              onChange: updateIngestProcess
            }, [])
        ]),
        h("div.flex.row", [
          h("h6", { style: { margin: "0px" } }, `Scale: ${scale}`),
          h("h6", { style: { margin: "0px" } }, `Source ID: ${source_id}`),
        ]),
        h.if(raster_url != null)([
          " ",
          h("span.raster", { style: { marginTop: ".5rem" } }, "Raster"),
        ]),
        h.if(slug !== undefined)("a", { href: sourcesRecordURL }, "Sources record map"),
      ]),
      h("div", {}, [
        h.if(user !== undefined)([
          "",
          h(AnchorButton, { href: edit_href, icon: "edit" }),
        ]),
      ]),
    ]
  );
}

export default IngestProcessCard;
