import { Button, HTMLSelect } from "@blueprintjs/core";
import h from "./index.module.sass";

/** A select that can be cleared back to null via an adjacent close button. The
 * leading placeholder option represents the null state within the dropdown. */
export function NullableDropdown({
  options,
  value,
  onChange,
  placeholder = "—",
}) {
  const allOptions = [{ label: placeholder, value: "" }, ...options];
  return h("div.nullable-dropdown", [
    h(HTMLSelect, {
      fill: true,
      options: allOptions,
      value: value ?? "",
      onChange: (evt) => onChange(evt.target.value || null),
    }),
    h(Button, {
      icon: "cross",
      minimal: true,
      disabled: value == null,
      "aria-label": "Clear selection",
      onClick: () => onChange(null),
    }),
  ]);
}
