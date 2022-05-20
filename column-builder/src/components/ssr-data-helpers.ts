import { UnitsView } from "~/index";

/* A collection of data processing functions to run server side before page is rendered */

/**
 * Creates a list of objects where the key is a section_id and the values are the
 * corresponding units belonging to that section
 * @param units UnitsView[]
 * @returns unitsBySection - {[section_id: number]: UnitsView[]}[]
 */
function createUnitBySections(units: UnitsView[]) {
  if (!units) return [];
  const seen: { [section_id: number | string]: number } = {}; // store section_ids and their index in array
  const unitsBySections: { [section_id: string | number]: UnitsView[] }[] = [];

  units.map((unit, i) => {
    if (unit.section_id in seen) {
      const index = seen[unit.section_id];
      unitsBySections[index][unit.section_id].push(unit);
    } else {
      let index = 0;
      if (unitsBySections.length > 0) {
        index = unitsBySections.length;
      }
      seen[unit.section_id] = index;
      unitsBySections.push({ [unit.section_id]: [unit] });
    }
  });
  return unitsBySections;
}

export { createUnitBySections };
