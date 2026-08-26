import hyper from "@macrostrat/hyper";
import Tag from "./Tag";
import styles from "./ingest-process-card.module.sass";
import {
  MapTagControlButton,
  useSourceTags,
  type TaggableMap,
} from "./map-tags";

const h = hyper.styled(styles);

/** Normalize the tags field (`string[]` or `[{ tag }]`) to a string list. */
function tagNames(tags: IngestProcess["tags"] | undefined): string[] {
  return (tags ?? []).map((t: any) => (typeof t === "string" ? t : t.tag));
}

/**
 * Per-map tag display + editor. Renders the map's state and current tags, and a
 * **Tags** button opening the same multi-select `TagEditor` the ingestion list
 * uses — so a single map is just a one-element selection. Add/remove goes
 * through the shared source_id-keyed write path (see `map-tags`). Current tags
 * are fetched by `source_id` (seeded from `data.tags` if present), so this works
 * on any surface that knows a map's `source_id`; `onUpdate` also fires so a
 * parent can re-read.
 */
export function IngestTagDisplay({
  data,
  ingestProcess,
  onUpdate,
}: {
  data: IngestProcess;
  ingestProcess?: IngestProcess;
  onUpdate?: () => void;
}) {
  const process = data ?? ingestProcess;
  const { tags, refresh } = useSourceTags(
    process?.source_id,
    tagNames(process?.tags)
  );
  const map: TaggableMap = { source_id: process?.source_id, tags };
  const onChanged = () => {
    refresh();
    onUpdate?.();
  };

  return h(
    "div.flex.row",
    {
      style: {
        paddingBottom: "4px",
        display: "flex",
        flexWrap: "wrap",
        gap: "0.5em",
        alignItems: "center",
        maxWidth: "100%",
      },
    },
    [
      h.if(process?.state != null)(
        Tag,
        { value: process.state, style: { marginTop: "auto", marginBottom: "auto" } },
        []
      ),
      tags.map((tag) =>
        h(Tag, {
          key: tag,
          value: tag,
          style: { marginTop: "auto", marginBottom: "auto" },
        })
      ),
      h(MapTagControlButton, {
        maps: [map],
        onChanged,
        label: "Tags",
      }),
    ]
  );
}
