import h from "@macrostrat/hyper";
import { ExpansionPanel } from "@macrostrat/map-interface";
import LongText from "../long-text";
import { IntervalChip } from "../info-blocks";
import { useAppActions } from "#/map/map-interface/app-state";
import { MapReference } from "~/components/map-info";
import { useState } from "react";
import { Icon, Button } from "@blueprintjs/core";


function SaveLocationForm({ onSubmit }) {
  const [formData, setFormData] = useState({
    location_name: "",
    location_description: "",
    latitude: "",
    longitude: "",
  });
    const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };
  return h("form.save-location-form", { onSubmit: handleSubmit }, [
    h("label", ["Location Name", h("input", { type: "text", name: "location_name", value: formData.location_name, onChange: handleChange })]),
    h("label", ["Location Description", h("textarea", { name: "location_description", value: formData.location_description, onChange: handleChange })]),
    h("label", ["Latitude", h("input", { type: "number", name: "latitude", value: formData.latitude, onChange: handleChange })]),
    h("label", ["Longitude", h("input", { type: "number", name: "longitude", value: formData.longitude, onChange: handleChange })]),
    h("button", { type: "submit" }, "Save Location"),
  ]);
}

function LongTextRenderer(props) {
  const { name, text } = props;

  return h.if(text && text.length)(LongText, { name, text });
}

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
  const [showSaveLocationForm, setShowSaveLocationForm] = useState(false);
   const handleSaveLocationClick = () => {
    setShowSaveLocationForm(true);
  };
  const handleFormSubmit = (formData) => {
    console.log("Saved location data:", formData);
    setShowSaveLocationForm(false);
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
        h(Button, {
          className: "save-location-button",
          rightIcon: h(Icon, { icon: "floppy-disk", size: 12 }),
          minimal: true,
          small: true,
          onClick: handleSaveLocationClick,
        }, "Save Location"),
        showSaveLocationForm && h(SaveLocationForm, { onSubmit: handleFormSubmit }),
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
