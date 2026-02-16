import { NonIdealState, Spinner } from "@blueprintjs/core";
import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";
import { FeatureProperties, LocationPanel } from "@macrostrat/map-interface";
import { ExpansionPanel } from "@macrostrat/data-components";
import { getColors } from "#/dev/map/rockd-strabospot/map-style";
import { useInDarkMode } from "@macrostrat/ui-components";
import { SaveLocationForm } from "./save-location";
import mapboxgl from "mapbox-gl";
import React, { useState, useEffect } from "react";

const h = hyper.styled(styles);
export function DetailsPanel({ position, nearbyFeatures, onClose }) {
  if (position == null) return null;
  let count = 24;

  return h(
    LocationPanel,
    {
      onClose,
      position,
    },
    [
      h(SaveLocationForm, { position, count }),
      //h(CheckinsPanel, { nearbyFeatures })
    ]
  );
}

export function SpotsPanel({ onSelectPosition, map }) {
  const [features, setFeatures] = useState([]); // State to store features
  const [loading, setLoading] = useState(true); // State to track loading
  const [error, setError] = useState(null); // State to track errors

  useEffect(() => {
    const fetchFeatures = async () => {
      try {
        const response = await fetch(
          "https://dev.macrostrat.org/api/pg/saved_locations"
        );
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        setFeatures(data); // Update features state
      } catch (err) {
        setError(err.message); // Set error message
      } finally {
        setLoading(false); // Stop loading
      }
    };

    fetchFeatures();
  }, []);

  const FeatureComponent = ({ data, onSelectPosition, map }) => {
    const handleLinkClick = () => {
      if (onSelectPosition) {
        onSelectPosition(
          { lng: data.longitude, lat: data.latitude, zoom: 7 },
          map
        );
      }
    };
    return h("div.feature", [
      h(
        "h3.feature-title",
        {
          style: { cursor: "pointer", textDecoration: "bold", color: "purple" }, // Optional styling for a clickable look
          onClick: handleLinkClick,
        },
        data.location_name
      ),
      h("p.feature-description", data.location_description),
      h("p.feature-coordinates", [
        `Latitude: ${data.latitude}, Longitude: ${data.longitude}`,
      ]),
      h("p.feature-category", `Category: ${data.category}`),
      h("p.feature-dates", [
        `Created at: ${new Date(data.created_at).toLocaleString()}`,
        `Updated at: ${new Date(data.updated_at).toLocaleString()}`,
      ]),
    ]);
  };
  const titleComponent = () =>
    h(PanelHeader, {
      title: "My Saved Locations",
      hasData: features.length != 0,
    });

  return h(FeatureTypePanel, {
    features,
    titleComponent,
    loading,
    error,
    featureComponent: (props) =>
      h(FeatureComponent, { ...props, onSelectPosition, map }),
  });
}

function FeatureTypePanel({
  features,
  titleComponent,
  loading = false,
  error = null,
  featureComponent,
}) {
  if (loading) return h(Spinner);
  if (error != null) {
    return h(NonIdealState, {
      title: "Error loading features",
      description: `${error}`,
      icon: "error",
    });
  }
  return h("div.feature-panel", [
    h(
      ExpansionPanel,
      {
        titleComponent,
        title: null,
        expanded: true,
      },
      h(Features, {
        features,
        featureComponent,
      })
    ),
  ]);
}

export function Features({ features, featureComponent = FeatureProperties }) {
  return h(
    "div.features",
    features.map((feature, i) => h(featureComponent, { key: i, data: feature }))
  );
}

function PanelHeader({ title, sourceLink, hasData }) {
  return h("div.panel-header", [
    h("h2", title),
    h("span.details", [
      h.if(hasData && sourceLink != null)([sourceLink]),
      h.if(!hasData)("span.no-data", "None nearby"),
    ]),
  ]);
}

function SystemLink({ href, children }) {
  return h("span.system-link", [
    "via ",
    h("a.system-link", { href }, children),
  ]);
}

function Swatch({ color }) {
  return h("span.swatch", { style: { backgroundColor: color } });
}
