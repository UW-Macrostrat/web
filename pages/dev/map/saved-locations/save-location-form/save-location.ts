import styles from "./save-location.module.styl";
import { hyperStyled } from "@macrostrat/hyper";
import { Button, Icon } from "@blueprintjs/core";
import React, { useState } from "react";

export function SaveLocationButton({ onClick }) {
  const h = hyperStyled(styles); // Use hyperStyled for scoped styling
  return h(
    Button,
    {
      className: styles["save-location-button"],
      rightIcon: h(Icon, { icon: "floppy-disk", size: 12 }),
      minimal: true,
      small: true,
      onClick: onClick,
    },
    "Save Location"
  );
}



export function SaveLocationForm({ onSubmit, onViewLocations }) {
  const h = hyperStyled(styles);

  const [formData, setFormData] = useState({
    location_name: "",
    location_description: "",
    category: "",
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
  const handleViewLocations = (e) => {
  e.preventDefault();
  onViewLocations()
  };

  return h("div.save-location-container", [
    h("form.save-location-form", { onSubmit: handleSubmit, onViewLocations: handleViewLocations }, [
      h("div.form-field", [
        h("label", ["Location Name"]),
        h("input", {
          type: "text",
          name: "location_name",
          value: formData.location_name,
          onChange: handleChange,
        }),
      ]),
      h("div.form-field", [
        h("label", ["Location Description"]),
        h("textarea", {
          name: "location_description",
          value: formData.location_description,
          onChange: handleChange,
        }),
      ]),
      h("div.form-field", [
        h("label", ["Category"]),
        h(
          "select",
          {
            name: "category",
            value: formData.category,
            onChange: handleChange,
          },
          [
            h("option", { value: "" }, "Select a category"),
            h("option", { value: "Favorites" }, "Favorites"),
            h("option", { value: "Want to go" }, "Want to go"),
            h("option", { value: "Geological wonder" }, "Geological wonder"),
          ]
        ),
      ]),
      h("div.button-container", [
        h(
          "button",
          { type: "submit", className: styles["save-btn"] },
          "Save Location"
        ),
        h(
          "button",
          {
            type: "button",
            onClick: handleViewLocations,
            className: styles["view-locations-btn"],
          },
          "View Locations"
        ),
      ]),
    ]),
  ]);
}
