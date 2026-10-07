/** The editor's closed vocabularies: what a unit's status and a contact can
 * be. Pure model; the selectors that pick them are in `./cell-surfaces`. */

export interface Choice {
  value: string;
  label: string;
  description?: string;
}

/** What a unit is. Most are *defined* — rock described by the unit's
 * attributes. A *covered* interval is known to be there but unexposed, so its
 * description is uncertain (the format's `covered`); an *empty* unit holds a
 * place in the section and nothing more — the gap left when a surface is
 * added past the column's end. */
export const UNIT_STATUSES: Choice[] = [
  { value: "defined", label: "Defined", description: "Rock, described" },
  {
    value: "covered",
    label: "Covered",
    description: "Present but unexposed; its description is uncertain",
  },
  { value: "empty", label: "Empty", description: "A placeholder in the section" },
];

export const DEFAULT_UNIT_STATUS = "defined";

/** A unit's status, the default where none is set. */
export function unitStatus(unit: { unit_status?: string | null }): string {
  return unit?.unit_status ?? DEFAULT_UNIT_STATUS;
}

/** The kinds of contact a measured section's surfaces are logged as — the
 * format's `basal_surface`, on the unit above. */
export const CONTACT_TYPES: Choice[] = [
  { value: "conformable", label: "Conformable" },
  { value: "unconformable", label: "Unconformable" },
  { value: "sharp", label: "Sharp" },
  { value: "gradational", label: "Gradational" },
  { value: "erosive", label: "Erosive" },
];

export function choiceLabel(choices: Choice[], value: any): string {
  if (value == null || value === "") return "";
  return choices.find((d) => d.value === value)?.label ?? String(value);
}

/** A warning for a value that isn't one of the choices — typed in the
 * spreadsheet view, or loaded from elsewhere. */
export function validateChoice(choices: Choice[], noun: string) {
  return (value: any) => {
    if (value == null || value === "") return null;
    if (choices.some((d) => d.value === value)) return null;
    return {
      severity: "warning" as const,
      message: `Not a ${noun}: ${value} (${choices.map((d) => d.value).join(", ")})`,
    };
  };
}
