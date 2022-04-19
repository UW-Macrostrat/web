import pg, { tableInsert, UnitEditorModel, UnitsView } from "../../../src";

const keys = [
  "strat_name",
  "color",
  "outcrop",
  "fo",
  "lo",
  "position_bottom",
  "position_top",
  "max_thick",
  "min_thick",
  "section_id",
  "col_id",
  "notes",
];

async function createNewSection(col_id: number) {
  const { data, error } = await pg
    .from("sections")
    .insert([{ col_id: col_id }]);

  const s_id = data ? data[0].id : null;
  return s_id;
}

export const persistNewUnitChanges = async (
  updatedModel: UnitEditorModel,
  changeSet: Partial<UnitEditorModel>,
  section_id: any,
  col_id: number
) => {
  let s_id = section_id;
  if (s_id == null) {
    // we're making a new section with this unit
    s_id = await createNewSection(col_id);
  }
  console.log(updatedModel, changeSet);
  let unit_id: number;

  const unit: Partial<UnitsView> = {};
  keys.map((k) => {
    if (k == "strat_name") {
      unit.strat_name_id = changeSet.unit?.strat_name.id;
    } else {
      //@ts-ignore
      unit[k] = changeSet.unit[k];
    }
  });
  unit.section_id = s_id;
  const { data, error } = await tableInsert("units", {
    col_id: col_id,
    ...unit,
  });

  unit_id = data ? data[0].id : null;

  if (changeSet.envs) {
    const inserts = changeSet.envs.map((e) => {
      return { unit_id: unit_id, environ_id: e.id };
    });
    const { data, error } = await pg.from("unit_environs").insert(inserts);
  }
  if (changeSet.liths) {
    const inserts = changeSet.liths.map((e) => {
      return { unit_id: unit_id, lith_id: e.id };
    });
    const { data, error } = await pg.from("unit_liths").insert(inserts);
  }
};
