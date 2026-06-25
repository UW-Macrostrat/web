import { Radio, RadioGroup } from "@blueprintjs/core";
import { NullableSlider } from "@macrostrat/ui-components";
import h from "@macrostrat/hyper";
import { SETTINGS } from "@macrostrat-web/settings";
import { LngLatBoundsLike } from "mapbox-gl";

/** Base map selector. By default offers all three basemaps; pass `options` (a
 * list of Basemap values) to restrict the choices, e.g. on pages where "none"
 * isn't meaningful. */
export function BaseLayerSelector({ layer, setLayer, showTitle = true, options }) {
  const allOptions = [
    { label: "Satellite", value: Basemap.Satellite },
    { label: "Basic", value: Basemap.Basic },
    { label: "None", value: Basemap.None },
  ];
  let opts = allOptions;
  if (options != null) {
    opts = allOptions.filter((o) => options.includes(o.value));
  }

  let title = null;
  if (showTitle) {
    title = h("h3", "Base layer");
  }

  return h("div.base-layer-selector", [
    title,
    h(
      RadioGroup,
      {
        selectedValue: layer,
        onChange(e) {
          setLayer(e.currentTarget.value);
        },
      },
      opts.map((o) => h(Radio, { key: o.value, label: o.label, value: o.value }))
    ),
  ]);
}

export function OpacitySlider(props) {
  return h("div.opacity-slider", [
    h(NullableSlider, {
      value: props.opacity,
      min: 0.1,
      max: 1,
      labelStepSize: 0.2,
      stepSize: 0.1,
      onChange(v) {
        props.setOpacity(v);
      },
    }),
  ]);
}

export function ensureBoxInGeographicRange(bounds: LngLatBoundsLike) {
  if (bounds[1] < -90) bounds[1] = -90;
  if (bounds[3] > 90) bounds[3] = 90;
  return bounds;
}

export enum Basemap {
  Satellite = "satellite",
  Basic = "basic",
  None = "none",
}

export function basemapStyle(basemap, inDarkMode) {
  switch (basemap) {
    case Basemap.Satellite:
      return SETTINGS.satelliteMapURL;
    case Basemap.Basic:
      return inDarkMode ? SETTINGS.darkMapURL : SETTINGS.baseMapURL;
    case Basemap.None:
      return null;
  }
}
