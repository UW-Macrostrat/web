/** Every layer in the raster index, managed with the data sheet's own controls.
 *
 * Reads `raster_api.layers` through the PostgREST provider. Metadata is edited
 * in the grid or in the row editor beside it, and saved with the sheet's Save.
 * Saving sends each edited row's own editable fields rather than the
 * provider's whole-row upsert, which the view refuses because `raster_count`
 * is computed. A layer is created from the toolbar's "New layer" action: the
 * slug is its identity and its address, so it is typed once and locked after.
 */
import hyper from "@macrostrat/hyper";
import { AnchorButton, FormGroup, InputGroup, Intent } from "@blueprintjs/core";
import { RegionCardinality } from "@blueprintjs/table";
import {
  type ColumnSpec,
  createPostgRESTProvider,
  DataSheetDensity,
  DataSheetProvider,
  DataSheetRenderer,
  DataViewRendererType,
  SelectedRowEditor,
  showRowEditorAction,
  splitDataProviderProps,
  type TableAction,
  type TableActionContext,
  type TableDataProvider,
} from "@macrostrat/data-sheet";
import { useMemo } from "react";
import {
  createLayer,
  type LayerRow,
  layerMapURL,
  layerURL,
  rastersEndpoint,
  RESERVED_SLUGS,
  updateLayer,
} from "./api";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

function createLayersProvider(): TableDataProvider<LayerRow> {
  const provider = createPostgRESTProvider<LayerRow>({
    endpoint: rastersEndpoint,
    table: "layers",
    identityKey: "slug",
  });
  return {
    ...provider,
    async saveRows(rows) {
      // One request per layer; a failure stops the batch and is reported.
      for (const row of rows) {
        await updateLayer(row);
      }
    },
    async insertRow(row) {
      await createLayer(String(row.slug), row.name ?? null);
    },
  };
}

function formatRange(range: number[] | null) {
  if (range == null || range.length < 2) return "";
  return `${range[0]} – ${range[1]}`;
}

const columnSpec: ColumnSpec[] = [
  {
    key: "slug",
    name: "Layer",
    editable: false,
    valueRenderer: (slug) => h(LayerLink, { slug }),
  },
  { key: "name", name: "Name", editable: true },
  { key: "description", name: "Description", editable: true },
  { key: "raster_count", name: "Rasters", editable: false },
  { key: "minzoom", name: "Min zoom", editable: true },
  { key: "maxzoom", name: "Max zoom", editable: true },
  {
    key: "rescale_range",
    name: "Rescale range",
    editable: false,
    valueRenderer: formatRange,
  },
];

/** The layer's own page, which lists its rasters. */
function LayerLink({ slug }: { slug: string | null }) {
  if (slug == null) return null;
  return h("a", { href: layerURL(slug) }, slug);
}

function slugProblem(slug: string): string | null {
  if (slug === "") return null;
  if (!SLUG_PATTERN.test(slug)) {
    return "Lowercase letters, digits and hyphens only";
  }
  if (RESERVED_SLUGS.includes(slug)) return `"${slug}" is reserved`;
  return null;
}

interface NewLayerState {
  slug: string;
  name: string;
}

function NewLayerForm({
  state,
  setState,
}: {
  state: NewLayerState;
  setState(state: NewLayerState): void;
}) {
  const problem = slugProblem(state.slug);
  let slugIntent: Intent = Intent.NONE;
  if (problem != null) slugIntent = Intent.DANGER;

  return h("div.new-layer", [
    h(
      FormGroup,
      { label: "Slug", helperText: problem, intent: slugIntent },
      h(InputGroup, {
        placeholder: "e.g. aviris-2024",
        value: state.slug,
        intent: slugIntent,
        autoFocus: true,
        onChange: (e) => setState({ ...state, slug: e.target.value.trim() }),
      })
    ),
    h(
      FormGroup,
      { label: "Name" },
      h(InputGroup, {
        value: state.name,
        onChange: (e) => setState({ ...state, name: e.target.value }),
      })
    ),
  ]);
}

const newLayerAction: TableAction<LayerRow, NewLayerState> = {
  id: "new-layer",
  name: "New layer",
  icon: "add",
  description: "The slug is the layer's address and can't be changed later.",
  targets: [
    "none",
    RegionCardinality.CELLS,
    RegionCardinality.FULL_ROWS,
    RegionCardinality.FULL_COLUMNS,
    RegionCardinality.FULL_TABLE,
  ],
  requiresEditable: false,
  defaultState: { slug: "", name: "" },
  detailsForm: NewLayerForm,
  isReady: (state) => state.slug !== "" && slugProblem(state.slug) == null,
  errorMessage: "Could not create the layer",
  async run(ctx, state) {
    if (state == null) return;
    await ctx.insertRow?.({
      slug: state.slug,
      name: state.name.trim() || null,
    });
  },
};

function selectedLayer(ctx: TableActionContext<LayerRow>): LayerRow | null {
  if (ctx.rowIndex == null) return null;
  return ctx.data[ctx.rowIndex] ?? null;
}

/** A link rather than a `run`, so it opens in a new tab like any other. */
const viewMapAction: TableAction<LayerRow> = {
  id: "view-map",
  name: "View map",
  icon: "map",
  targets: [RegionCardinality.CELLS, RegionCardinality.FULL_ROWS],
  requiresEditable: false,
  appliesTo: (ctx) => selectedLayer(ctx) != null,
  render(ctx) {
    const layer = selectedLayer(ctx);
    if (layer == null) return null;
    return h(AnchorButton, {
      minimal: true,
      small: true,
      icon: "map",
      text: "View map",
      href: layerMapURL(layer.slug),
    });
  },
};

const actions: TableAction<any, any>[] = [
  newLayerAction,
  viewMapAction,
  showRowEditorAction,
];

export function LayersSheet() {
  const provider = useMemo(createLayersProvider, []);
  // Provider and grid are mounted apart so the row editor can sit beside it.
  const [providerProps, rendererProps] = useMemo(
    () =>
      splitDataProviderProps<LayerRow>({
        provider,
        columnSpec,
        actions,
        editable: true,
        name: "raster-layers",
        itemLabel: "layer",
        density: DataSheetDensity.MEDIUM,
        pageSize: 200,
        enableColumnReordering: false,
        viewType: DataViewRendererType.TABLE,
      } as any),
    [provider]
  );
  return h(DataSheetProvider<LayerRow>, providerProps as any, [
    h("div.layers-view", [
      h(
        "div.raster-sheet.layers-sheet",
        h(DataSheetRenderer<LayerRow>, rendererProps as any)
      ),
      h("div.layer-editor", h(SelectedRowEditor)),
    ]),
  ]);
}
