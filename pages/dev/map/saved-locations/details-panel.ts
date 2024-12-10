import { NonIdealState, Spinner } from "@blueprintjs/core";
import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";
import {
  ExpansionPanel,
  FeatureProperties,
  LocationPanel,
} from "@macrostrat/map-interface";
import { useNearbyCheckins, useNearbySpots } from "./sidebar-data";
import { CheckinListing, SpotListing } from "@macrostrat/data-components";
import { getColors } from "#/dev/map/rockd-strabospot/map-style";
import { useInDarkMode } from "@macrostrat/ui-components";
import { SaveLocationButton, SaveLocationForm } from "./save-location-form/save-location";
import { ViewLocations } from "./save-location-form/view-locations";
import { useAppState } from "#/map/map-interface/app-state";
import React, { useState } from "react";



const h = hyper.styled(styles);

export function DetailsPanel({ position, nearbyFeatures, onClose }) {
  console.log("position ", position)
  console.log("features ", nearbyFeatures)
  const [showSaveLocationForm, setShowSaveLocationForm] = useState(false);
  const handleSaveLocationClick = () => {
      setShowSaveLocationForm((prevState) => !prevState);
    };
  if (position == null) return null;
  return h(
    LocationPanel,
    {
      onClose,
      position,
    },
    [
      h(SpotsPanel, {
        nearbyFeatures,
      }),
      h(SaveLocationButton, {onClick: handleSaveLocationClick,}),
      showSaveLocationForm && h(SaveLocationForm, { onSubmit: handleFormSubmit, onViewLocations: handleViewLocationsForm }),
      //locations && h(ViewLocations, { locations }),
    ]
  );
}



/*
//import lat and lng from file1 or call function from file1 to obtain the lat and lng

  const [locations, setLocations] = useState(0)



  //id is a sequential serial within the database and webanon has to
  //specify every column value in order for any payload to post to the
  //saved locations table. TODO specify permissions and RLA in postgrest.
  let count_id = 18
  let position = useAppState((state) => state.core.infoMarkerPosition);
  let lat = position.lat
  let lng = position.lng

  const handleFormSubmit = async (formData) => {
    count_id = count_id + 1;
    const payload = {
      id: count_id,
      user_id: 46,
      location_name: formData.location_name,
      location_description: formData.location_description,
      latitude: lat,  //need latitude from state
      longitude: lng, //need longitude from state
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      category: formData.category
    };
    console.log("posting with this payload", payload)
    const response = await fetch("https://dev2.macrostrat.org/api/pg/saved_locations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    console.log(response)
    console.log(response.ok)
    console.log(response.status)
    console.log(response.statusText)
    if (response.status != 201) {
      alert(`Error ${response.status}: ${response.statusText}`)
    }
    else {
      alert("Saved successfully")
    }
    setShowSaveLocationForm(false);
  };

//build own view locations component outside of geo-map
  const handleViewLocationsForm = async () => {
    const response = await fetch("https://dev2.macrostrat.org/api/pg/saved_locations", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.status !== 200) {
      alert(`Error ${response.status}: ${response.statusText}`)
    }
    else {
      const result = await response.json();
      console.log(result)
      setLocations(result);
    }
  };



  */



export function SpotsPanel({ nearbyFeatures }) {
  // Here, we handle loading state for feature
  const [features, loading, error] = useNearbySpots(nearbyFeatures);


  const titleComponent = () =>
    h(PanelHeader, {
      title: "Saved locations",
      sourceLink: h(
        SystemLink,
        { href: "https://strabospot.org" },
        "StraboSpot"
      ),
      hasData: features.length != 0,
    });

  return h(FeatureTypePanel, {
    features,
    titleComponent,
    loading,
    error,
    featureComponent: spotfeature,
  });
}

const spotfeature = (props) => h(SpotListing, { spot: props.data });

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

  // if (features.length == 0) {
  //   return h("div.empty-list", h("p", "No nearby " + title));
  // }

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

export function LegendList() {
  const darkMode = useInDarkMode();
  const colors = getColors(darkMode);
  return h("ul.legend-list", [
    h(
      LegendItem,
      {
        color: colors.checkins,
        name: "Checkins",
        sourceLink: h(SystemLink, { href: "https://rockd.org" }, "Rockd"),
      },
      "Outcrops collected as part of a community-collaborative field guide."
    ),
    h(
      LegendItem,
      {
        color: colors.spots,
        name: "Spots",
        sourceLink: h(
          SystemLink,
          { href: "https://strabospot.org" },
          "StraboSpot"
        ),
      },
      "Sites collected for research purposes (filtered for general interest)."
    ),
  ]);
}

function LegendItem({ color, name, sourceLink, children }) {
  let child = children;
  if (typeof children === "string") {
    child = h("p.description", children);
  }

  return h("li.legend-item", [
    h(LegendHeader, { color, name, sourceLink }),
    h("div.legend-body", child),
  ]);
}

function LegendHeader({ color, name, sourceLink = null }) {
  return h("div.legend-header", [
    h(Swatch, { color }),
    h("h4", name),
    sourceLink,
  ]);
}

function Swatch({ color }) {
  return h("span.swatch", { style: { backgroundColor: color } });
}
