/** The rasters of one layer, or of the inbox (`layer: null`).
 *
 * One sheet for both: the provider differs only in its base filter. Paging,
 * sorting and column filters are the provider's own, done by PostgREST. The
 * only edit is assignment — select rows, pick a layer — sent as a `PATCH` of
 * `layer` alone, since that is the one column the view lets through.
 */
import hyper from "@macrostrat/hyper";
import { AnchorButton, Button, HTMLSelect, Intent } from "@blueprintjs/core";
import { RegionCardinality } from "@blueprintjs/table";
import {
  type ColumnSpec,
  createPostgRESTProvider,
  ctx,
  DataSheet,
  type CellRenderContext,
  DataSheetDensity,
  type TableAction,
  type TableActionContext,
} from "@macrostrat/data-sheet";
import { useEffect, useMemo, useState } from "react";
import { formatDateTime } from "../api";
import {
  assignRasters,
  fetchLayers,
  type LayerRow,
  rasterMapURL,
  type RasterRow,
  rastersEndpoint,
} from "./api";
import { refreshRowsAtom, selectedRastersAtom } from "./view-state";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

/** The picker's value for "no layer"; no slug can be empty. */
const INBOX = "";

function createRastersProvider(layer: string | null) {
  const provider = createPostgRESTProvider<RasterRow>({
    endpoint: rastersEndpoint,
    table: "rasters",
    identityKey: "id",
    // Newest registrations first, until a column sort says otherwise.
    identityAscending: false,
    baseFilter(query) {
      if (layer == null) return query.is("layer", null);
      return query.eq("layer", layer);
    },
  });
  // Read-only apart from assignment, which has its own request.
  return { ...provider, saveRows: undefined, deleteRows: undefined };
}

/** The raster's name, linked to its map. */
function rasterName(slug: string, ctx?: CellRenderContext) {
  const row = ctx?.row as RasterRow | null | undefined;
  if (row == null) return slug;
  return h("a", { href: rasterMapURL(row) }, slug);
}

const columnSpec: ColumnSpec[] = [
  { key: "slug", name: "Raster", editable: false, valueRenderer: rasterName },
  { key: "host", name: "Host", editable: false },
  { key: "href", name: "Address", editable: false },
  { key: "dtype", name: "Type", editable: false },
  { key: "nbands", name: "Bands", editable: false },
  { key: "crs", name: "CRS", editable: false },
  { key: "minzoom", name: "Min zoom", editable: false },
  { key: "maxzoom", name: "Max zoom", editable: false },
  {
    key: "created_at",
    name: "Registered",
    editable: false,
    valueRenderer: formatDateTime,
  },
  {
    key: "updated_at",
    name: "Updated",
    editable: false,
    valueRenderer: formatDateTime,
  },
];

function useLayers(): LayerRow[] {
  const [layers, setLayers] = useState<LayerRow[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetchLayers()
      .then((rows) => {
        if (!cancelled) setLayers(rows);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return layers;
}

function destinationOptions(layers: LayerRow[], current: string | null) {
  const options = layers
    .filter((l) => l.slug !== current)
    .map((l) => ({ value: l.slug, label: l.name ?? l.slug }));
  if (current != null) {
    options.unshift({ value: INBOX, label: "Inbox (no layer)" });
  }
  return options;
}

/** Single-value layer picker for the selected rasters. */
function AssignControl({ layer }: { layer: string | null }) {
  const rasters = ctx.useValue(selectedRastersAtom) as RasterRow[];
  const refreshRows = ctx.useSet(refreshRowsAtom);
  const layers = useLayers();
  const options = destinationOptions(layers, layer);
  const [target, setTarget] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const destination = target ?? options[0]?.value ?? null;

  async function move() {
    if (destination == null) return;
    let newLayer: string | null = destination;
    if (destination === INBOX) newLayer = null;
    setBusy(true);
    setError(null);
    try {
      await assignRasters(
        rasters.map((r) => r.id),
        newLayer
      );
      refreshRows();
    } catch (e: any) {
      // A slug already used in the destination layer is the usual cause.
      setError(e?.message ?? "Could not move the rasters");
    } finally {
      setBusy(false);
    }
  }

  let label = `Move ${rasters.length} rasters`;
  if (rasters.length === 1) label = "Move 1 raster";

  return h("div.assign-control", [
    h(HTMLSelect, {
      value: destination ?? "",
      options,
      disabled: options.length === 0,
      onChange: (e) => setTarget(e.currentTarget.value),
    }),
    h(Button, {
      text: label,
      icon: "layers",
      intent: Intent.PRIMARY,
      loading: busy,
      disabled: destination == null || rasters.length === 0,
      onClick: move,
    }),
    h.if(error != null)("span.error", error),
  ]);
}

function assignAction(layer: string | null): TableAction<RasterRow> {
  return {
    id: "assign-layer",
    name: "Layer",
    icon: "layers",
    targets: [RegionCardinality.FULL_ROWS],
    requiresEditable: false,
    render: () => h(AssignControl, { layer }),
  };
}

function selectedRasterMapURL(ctx: TableActionContext<RasterRow>) {
  if (ctx.rowIndex == null) return null;
  const raster = ctx.data[ctx.rowIndex];
  if (raster == null) return null;
  return rasterMapURL(raster);
}

/** A link rather than a `run`, so it opens in a new tab like any other. */
const viewMapAction: TableAction<RasterRow> = {
  id: "view-map",
  name: "View map",
  icon: "map",
  targets: [RegionCardinality.CELLS, RegionCardinality.FULL_ROWS],
  requiresEditable: false,
  appliesTo: (ctx) => selectedRasterMapURL(ctx) != null,
  render(ctx) {
    const href = selectedRasterMapURL(ctx);
    if (href == null) return null;
    return h(AnchorButton, {
      minimal: true,
      small: true,
      icon: "map",
      text: "View map",
      href,
    });
  },
};

export function RastersSheet({ layer }: { layer: string | null }) {
  const provider = useMemo(() => createRastersProvider(layer), [layer]);
  const actions = useMemo(() => [assignAction(layer), viewMapAction], [layer]);
  return h("div.raster-sheet", [
    h(DataSheet<RasterRow>, {
      provider,
      columnSpec,
      actions,
      editable: false,
      name: "rasters",
      itemLabel: "raster",
      density: DataSheetDensity.MEDIUM,
      pageSize: 200,
      enableColumnReordering: false,
    }),
  ]);
}
