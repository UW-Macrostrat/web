// Settings panel for the map

import h from "@macrostrat/hyper";
import { LinkButton } from "@macrostrat/router-components";
import { GlobeSettings } from "@macrostrat/cesium-viewer/settings";
import { useLocation } from "react-router";
import { useSelector } from "react-redux";
import { MapBackend } from "../reducers/actions";
import {
  MapPerformanceStep,
  PerformanceState,
  ResourceCounts,
} from "./performance";
import React from "packages/ui-components/node_modules/@types/react";

function useMapBackend() {
  return useSelector((d) => d.update.mapBackend.current);
}

function MapTypeButton(props) {
  const { hash } = useLocation();

  const globeActive = useMapBackend() == MapBackend.CESIUM;
  const pathname = globeActive ? "/map" : "/globe";
  const name = globeActive ? "map" : "globe";

  return h(LinkButton, { to: { pathname, hash } }, `Switch to ${name}`);
}

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

function Label({ name, value, formatter = (d) => d }) {
  return h("li", [h("span.name", name), h("span.value", formatter(value))]);
}

const SizeLabel = ({ name, value }) => {
  return h(Label, { name, value, formatter: formatBytes });
};

function PerformanceSection({
  name,
  data,
  children,
}: {
  name: string;
  data: ResourceCounts;
  children: React.ReactNode;
}) {
  return h("div.timing-section", [
    h("h4", name),
    h("ul", [
      h(SizeLabel, { name: "Size", value: data.totalSize }),
      h(Label, { name: "Resources loaded", value: data.requests.length }),
      children,
    ]),
  ]);
}

function TimingSection({
  name,
  data,
  children,
}: {
  name: string;
  data: MapPerformanceStep;
  children: React.ReactNode;
}) {
  let value = "...";
  if (data.endTime != null) {
    value = (data.endTime - data.startTime) / 1000 + " s";
  }

  return h(PerformanceSection, { name, data }, [
    h(Label, { name: "Duration", value }),
  ]);
}

function PerformanceTimings({ data }: { data: PerformanceState }) {
  const mapSteps = data.steps.filter(
    (d) => d.name == "map-loading" && d.requests.length > 0
  );
  return h("div.performance-timings", [
    h("h3", "Performance"),
    h(PerformanceSection, { name: "Overall", data }),
    h.if(mapSteps.length > 0)(TimingSection, {
      name: "Initial map load",
      data: mapSteps[0],
    }),
    h.if(mapSteps.length > 1)(TimingSection, {
      name: "Last map load",
      data: mapSteps[mapSteps.length - 1],
    }),
  ]);
}

const SettingsPanel = () => {
  const globeActive = useMapBackend() == MapBackend.CESIUM;
  const data = useSelector((d) => d.performance);
  return h("div.settings", [
    h(MapTypeButton),
    h.if(globeActive)(GlobeSettings),
    h(PerformanceTimings, { data }),
  ]);
};

export { SettingsPanel };
