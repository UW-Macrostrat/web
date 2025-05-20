import h from "@macrostrat/hyper";
import { useAPIResult } from "@macrostrat/ui-components";
import { SETTINGS } from "@macrostrat-web/settings";
import { PageHeader, Link, AssistantLinks, DevLinkButton } from "~/components";
import { Card, Icon, Popover, Divider, RangeSlider } from "@blueprintjs/core";
import { useState } from "react";
import { ContentPage } from "~/layouts";
import { usePageContext } from 'vike-react/usePageContext';
import {
  MapAreaContainer,
  MapMarker,
  MapView,
  buildInspectorStyle,
} from "@macrostrat/map-interface";
import { useMapRef } from "@macrostrat/mapbox-react";
import { contextPanelIsInitiallyOpen } from "#/map/map-interface/app-state";
import { useEffect } from "react";
import { Timescale } from "@macrostrat/timescale";

// DATA fetches correctly, layer isnt added correctly


export function Page() {
    return h(Timescale, { length: 800, levels: [1,5], ageRange: [0, 1000], absoluteAgeScale: true });
}