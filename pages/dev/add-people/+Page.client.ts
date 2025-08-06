import h from "./main.module.sass";

import { BasePage } from "~/components/general";
import { DataField } from "~/components/unit-details";
import { fetchPGData } from "~/_utils";

import { SaveButton } from "@macrostrat/ui-components";
import { postgrestPrefix } from "@macrostrat-web/settings";
import { MultiSelect } from "@blueprintjs/select";
import { MenuItem } from "@blueprintjs/core";

import { useEffect, useState } from "react";

export function Page() {
    const [form, setForm] = useState({
        name: null,
        email: null,
        title: null,
        website: null,
        img_id: null,
        active_start: null,
        active_end: null,
        roles: [],
    });

    const disabled = !form.name || !form.email || !form.title || !form.img_id || form.roles.length === 0;

    const handleChange = (field) => (value) => {
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
                    value: form.img_id,
                    onChange: handleChange("img_id"),
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
                    value: form.active_start,
                    onChange: handleChange("active_start"),
                    required: true
                }),
                h(DateInput, {
                    label: "Active End Date",
                    value: form.active_end,
                    onChange: handleChange("active_end")
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
        if (disabled) return;

        // Destructure roles and img_id, default img_id if missing
        const { roles, ...personData } = form;
        const filteredPersonData = Object.fromEntries(
            Object.entries(personData).filter(([_, v]) => v !== null && v !== undefined)
        );

        const testBody = new URLSearchParams(filteredPersonData).toString();

        fetch(`${postgrestPrefix}/people`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Prefer": "return=representation",
            },
            body: testBody,
        })
        .then(r => r.json())
        .then(data => {
            const personId = data[0].person_id;

            roles.forEach(roleId => {
                console.log("Assigning role:", roleId, "to person:", personId);
                const body = new URLSearchParams({ person_id: personId, role_id: roleId }).toString();

                fetch(`${postgrestPrefix}/people_roles`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                        "Prefer": "return=representation",
                    },
                    body,
                })
                .catch(e => console.error("Role assignment error:", e));
            });
        })
        .catch(e => console.error("Test submission error:", e));
    };

    return h(SaveButton, { disabled, onClick: handleSubmit }, text);
}

function RolesInput({ setForm }) {
  const [roles, setRoles] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState([]);

  useEffect(() => {
    fetchPGData("/roles", {})
      .then((data) => {
        setRoles(data); 
      })
      .catch((err) => {
        console.error("Failed to fetch roles:", err);
      });
  }, []);

  const isItemSelected = (item) =>
    selectedRoles.some((r) => r.role_id === item.role_id);

  const handleItemSelect = (item) => {
    if (!isItemSelected(item)) {
      const next = [...selectedRoles, item];
      console.log('Selected roles updated:', next.map((r) => r.role_id));
      setSelectedRoles(next);
      setForm((prev) => ({
        ...prev,
        roles: next.map((r) => r.role_id),
      }));
    }
  };

  const handleItemDelete = (itemToDelete) => {
    const next = selectedRoles.filter((item) => item.role_id !== itemToDelete.role_id);
    setSelectedRoles(next);
    setForm((prev) => ({
      ...prev,
      roles: next.map((r) => r.role_id),
    }));
  };

  const itemPredicate = (query, item) =>
    item.name.toLowerCase().includes(query.toLowerCase());

  const itemRenderer = (item, { handleClick, modifiers }) => {
    if (!modifiers.matchesPredicate) return null;

    return h(MenuItem, {
      key: item.role_id,
      text: item.name,
      onClick: handleClick,
      active: modifiers.active,
      shouldDismissPopover: false,
    });
  };

  const items = roles.filter((role) => !isItemSelected(role));

  return h(DataField, {
    label: "Roles *",
    value: h(MultiSelect, {
      items,
      itemRenderer,
      itemPredicate,
      selectedItems: selectedRoles,
      onItemSelect: handleItemSelect,
      onRemove: handleItemDelete,
      tagRenderer: (item) => item.name,
      popoverProps: { minimal: true },
      fill: true,
    }),
  });
}
