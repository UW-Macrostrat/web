import h from "@macrostrat/hyper";
import { ExpansionPanel } from "@macrostrat/map-interface";
import { IntervalChip } from "../info-blocks";
import { useAppActions, useAppState, useHashNavigate } from "#/map/map-interface/app-state";
import { MapReference } from "~/components/map-info";
import React, { useState } from "react";
import { SaveLocationButton, SaveLocationForm } from "./save-location-form/save-location";
import LongText from "#/map/map-interface/components/long-text";
import { ViewLocations } from "./save-location-form/view-locations";


function LongTextRenderer(props) {
  const { name, text } = props;
  return text && text.length ? h(LongText, { name, text }) : null;}

function GeoMapLines(props) {
  const { source } = props;
  if (!source.lines || source.lines.length == 0) {
    return h("div", [""]);
  }
  const { lines } = source;
  return h("div.map-source-attr", [
    h("span.attr", ["Lines "]),
    lines.map((line, i) => {
      const { name, type, direction, descrip } = line;
      return h("div.map-source-line", { key: i }, [
        h.if(name)("span.line-attr", [h("span.attr", ["Name: "]), name]),
        h.if(type)("span.line-attr", [h("span.attr", ["Type: "]), type]),
        h.if(direction)("span.line-attr", [
          h("span.attr", ["Direction: "]),
          line.direction,
        ]),
        h.if(descrip)("span.line-attr", [
          h("span.attr", ["Description: "]),
          descrip,
        ]),
      ]);
    }),
  ]);
}


function GeologicMapInfo(props) {
  const { bedrockExpanded, source } = props;
  const runAction = useAppActions();
  //import lat and lng from file1 or call function from file1 to obtain the lat and lng
  const [showSaveLocationForm, setShowSaveLocationForm] = useState(false);
  const handleSaveLocationClick = () => {
      setShowSaveLocationForm((prevState) => !prevState);
    };
  const [locations, setLocations] = useState(null)


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



  if (!source) return h("div");
  const interval = {
    int_name: source.age,
    b_age: source.b_int.b_age,
    t_age: source.t_int.t_age,
    color: "#cccccc",
  };

  return h(
    ExpansionPanel,
    {
      classes: { root: "regional-panel" },
      title: "Geologic map",
      helpText: "via providers, Macrostrat",
      expanded: bedrockExpanded,
    },
    [
      h("div.map-source-attrs", [
        h(SaveLocationButton, {
          onClick: handleSaveLocationClick,
        }),

        showSaveLocationForm && h(SaveLocationForm, { onSubmit: handleFormSubmit, onViewLocations: handleViewLocationsForm }),
        locations && h(ViewLocations, { locations }),

        h.if(source.name && source.name.length)("div.map-source-attr", [
          h("span.attr", ["Name: "]),
          source.name,
        ]),
        h.if(source.age && source.age.length)("div.map-source-attr", [
          h("span.attr", ["Age: "]),
          h(IntervalChip, {
            interval,
          }),
        ]),
        h(LongTextRenderer, {
          name: "Stratigraphic name(s)",
          text: source.strat_name,
        }),
        h(LongTextRenderer, {
          name: "Lithology",
          text: source.lith,
        }),
        h(LongTextRenderer, {
          name: "Description",
          text: source.descrip,
        }),
        h(LongTextRenderer, {
          name: "Comments",
          text: source.comments,
        }),
        h(GeoMapLines, { source }),
        h(MapReference, {
          reference: source.ref,
          onClickSourceID() {
            runAction({
              type: "set-focused-map-source",
              source_id: source.source_id,
            });
          },
        }),
      ]),
    ]
  );
}

export { GeologicMapInfo };
