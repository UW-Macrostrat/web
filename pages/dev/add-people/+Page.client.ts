import h from "./main.module.sass";

import { BasePage } from "~/components/general";
import { DataField } from "~/components/unit-details";
import { fetchPGData } from "~/_utils";

import { SaveButton } from "@macrostrat/ui-components";
import { MultiSelect } from "@blueprintjs/select";
import { MenuItem } from "@blueprintjs/core";

import { useEffect, useState } from "react";

export function Page() {
    const [form, setForm] = useState({
        name: "",
        email: "",
        title: "",
        website: "",
        profileImage: "",
        startDate: "",
        endDate: "",
        roles: [],
    });

    console.log("Initial form state:", form);

    const disabled = !form.name || !form.email || !form.title || !form.profileImage;

    const handleChange = (field) => (value) => {
        console.log(`${field} changed:`, value);
        setForm({ ...form, [field]: value });
    };

    return h(BasePage, { title: "Add people" }, [
        h("div.add-people-page", [
            h("p", "This page is meant to add people to the Macrostrat database. Please fill out the form below with the person's details."),
        ]),
        h('div.form', [
            h('div.inputs', [
                h(TextInput, {
                    label: "Name *",
                    value: form.name,
                    onChange: handleChange("name"),
                    required: true
                }),
                h(TextInput, {
                    label: "Email *",
                    value: form.email,
                    onChange: handleChange("email"),
                    required: true,
                    pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"
                }),
                h(TextInput, {
                    label: "Title *",
                    value: form.title,
                    onChange: handleChange("title"),
                    required: true
                }),
                h(RolesInput, { setForm }),
                h(ImageInput, {
                    label: "Profile Image *",
                    value: form.profileImage,
                    onChange: handleChange("profileImage"),
                    required: true
                }),
                h(TextInput, {
                    label: "Website",
                    value: form.website,
                    onChange: handleChange("website"),
                    pattern: "https?://.+"
                }),
                h(DateInput, {
                    label: "Active Start Date",
                    value: form.startDate,
                    onChange: handleChange("startDate"),
                    required: true
                }),
                h(DateInput, {
                    label: "Active End Date",
                    value: form.endDate,
                    onChange: handleChange("endDate")
                }),
            ]),
            h(SubmitButton, { disabled: false, form }),
            h("p.note", h('em', "Fields marked with * are required")),
        ]),
    ]);
}

// === Input Components ===

function TextInput({ label, value = "", onChange, required = false, pattern }) {
    return h(DataField, {
        label,
        value: h("input.text-input", {
            type: "text",
            value,
            required,
            pattern,
            onInput: (e) => onChange(e.target.value),
        })
    });
}

function DateInput({ label, value = "", onChange, required = false }) {
    return h(DataField, {
        label,
        value: h("input.date-input", {
            type: "date",
            value,
            required,
            onInput: (e) => onChange(e.target.value),
        })
    });
}

function ImageInput({ label, onChange, required = false }) {
    return h(DataField, {
        label,
        value: h("input.image-input", {
            type: "file",
            accept: "image/*",
            required,
            onChange: (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => onChange(event.target.result);
                    reader.readAsDataURL(file);
                }
            },
        }),
    });
}

function SubmitButton({ disabled, form }) {
    const text = disabled ? "Please fill out all required fields" : "Add person";

    const handleSubmit = () => {
        if (!disabled) {
            // Convert empty strings in form to null
            const formattedForm = Object.fromEntries(
                Object.entries(form).map(([key, value]) => [key, value === "" ? null : value])
            );

            console.log("Form submitted with data:", formattedForm);
            // Your form submission logic here, using formattedForm
        }
    };

    return h(SaveButton, { disabled, onClick: handleSubmit }, text)
}

function RolesInput({setForm}) {
  const [roles, setRoles] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState([]);

  useEffect(() => {
    fetchPGData("/roles", {})
      .then(data => {
        setRoles(data.map(role => role.name));
      })
      .catch((err) => {
        console.error("Failed to fetch roles:", err);
      });
  }, []);

  // Check if item is selected in selectedRoles (not roles)
  const isItemSelected = (item) => selectedRoles.includes(item);

  const handleItemSelect = (item) => {
    if (!isItemSelected(item)) {
      setSelectedRoles([...selectedRoles, item]);
      setForm((prev) => ({ ...prev, roles: [...prev.roles, item] }));
    }
  };

  const handleItemDelete = (itemToDelete) => {
    const next = selectedRoles.filter((item) => item !== itemToDelete);
    setSelectedRoles(next);
    setForm((prev) => ({ ...prev, roles: next }));
  };

  const itemPredicate = (query, item) =>
    item.toLowerCase().includes(query.toLowerCase());

    const itemRenderer = (item, { handleClick, modifiers }) => {
        if (!modifiers.matchesPredicate) return null;

        return h(MenuItem, {
            key: item,
            text: item,
            onClick: handleClick,
            active: modifiers.active,
            shouldDismissPopover: false,
        });
    };

    const items = roles.filter((f) => !isItemSelected(f));

    return h(DataField, {
        label: "Roles *",
        value: h(MultiSelect, {
            items,
            itemRenderer,
            itemPredicate,
            selectedItems: selectedRoles,
            onItemSelect: handleItemSelect,
            onRemove: handleItemDelete,
            tagRenderer: (item) => item,
            popoverProps: { minimal: true },
            fill: true,
        })
    });
}