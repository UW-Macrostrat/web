import styles from "./save-location.module.styl";
import { hyperStyled } from "@macrostrat/hyper";
import { Button, Icon } from "@blueprintjs/core";
import React, { useState } from "react";

/*
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
*/

export function SaveLocationForm({ position, count }) {
  const h = hyperStyled(styles);
  const [formData, setFormData] = useState({
    location_name: "",
    location_description: "",
    latitude: 0,
    longitude: 0,
    category: "",
  });

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const submitSavedLocation = async (e) => {
    e.preventDefault();
    const payload = {
      id: (count += 1),
      user_id: 46,
      location_name: formData.location_name,
      location_description: formData.location_description,
      latitude: position.lat,
      longitude: position.lng,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      category: formData.category,
    };
    console.log("Posting with this payload:", payload);
    await fetch("https://dev.macrostrat.org/api/pg/saved_locations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
      .then((response) => {
        if (!response.ok) {
          alert(`Error ${response.status}: ${response.statusText}`);
        } else {
          alert("Saved successfully");
        }
        return response.json();
      })
      .catch((error) => console.error("Error:", error));
  };

  return h("div.save-location-container", [
    h("form.save-location-form", { onSubmit: submitSavedLocation }, [
      h("div.form-field", [
        h("label", ["Location Name"]),
        h("input", {
          type: "text",
          name: "location_name",
          value: formData.location_name,
          onChange: handleInputChange, // Add onChange
        }),
      ]),
      h("div.form-field", [
        h("label", ["Location Description"]),
        h("textarea", {
          name: "location_description",
          value: formData.location_description,
          onChange: handleInputChange,
        }),
      ]),
      h("div.form-field", [
        h("label", ["Category"]),
        h(
          "select",
          {
            name: "category",
            value: formData.category,
            onChange: handleInputChange,
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
      ]),
    ]),
  ]);
}
