import { PostgrestResponse } from "@supabase/postgrest-js";
import pg, {
  UnitsView,
  tableUpdate,
  StratNameI,
  EnvironUnit,
  LithUnit,
} from "../..";
import { detectDeletionsAndAdditions } from "../helpers";

async function handleLithCollection(
  collection: LithUnit[],
  changes: LithUnit[],
  unit_id: number
) {
  // find deletions, and additions
  // for rest, set the prop where the id is already set
  const { deletions, additions } = detectDeletionsAndAdditions(
    collection,
    changes
  );

  changes.map(async (change) => {
    if (additions.has(change.id)) {
      // this is completely new! Insert!
      const { data, error } = await pg
        .from("unit_liths")
        .insert([{ unit_id: unit_id, lith_id: change.id, dom: change.dom }]);
    } else {
      // already exists! update!
      const { data, error } = await pg
        .from("unit_liths")
        .update({ dom: change.dom })
        .match({ unit_id: unit_id, lith_id: change.id });
    }
  });
  deletions.forEach(async (id) => {
    // delete from the table where id
    const { data, error } = await pg
      .from("unit_liths")
      .delete()
      .match({ unit_id: unit_id, lith_id: id });
  });
}

async function handleEnvironCollection(
  collection: EnvironUnit[],
  changes: EnvironUnit[],
  unit_id: number
) {
  const { deletions, additions } = detectDeletionsAndAdditions(
    collection,
    changes
  );

  deletions.forEach(async (id) => {
    const { data, error } = await pg
      .from("unit_environs")
      .delete()
      .match({ unit_id: unit_id, environ_id: id });
  });
  const inserts = [];
  additions.forEach((id) => {
    inserts.push({ unit_id, environ_id: id });
  });
  const { data, error } = await pg.from("unit_environs").insert(inserts);
}

async function handleStratNameCollection(
  collection: StratNameI[],
  changes: StratNameI[],
  unit_id: number
) {
  const { deletions, additions } = detectDeletionsAndAdditions(
    collection,
    changes
  );
  deletions.forEach(async (id) => {
    const { data, error } = await pg
      .from("unit_strat_names")
      .delete()
      .match({ unit_id: unit_id, strat_name_id: id });
  });
  const inserts = [];
  additions.forEach((id) => {
    inserts.push({ unit_id, strat_name_id: id });
  });
  const { data, error } = await pg.from("unit_strat_names").insert(inserts);
}

const persistable_fields = new Set([
  "strat_name",
  "lo",
  "fo",
  "min_thick",
  "max_thick",
  "notes",
  "color",
  "section_id",
  "col_id",
]);

async function updateExistingUnit(
  unit: UnitsView,
  updatedModel: UnitsView,
  changeSet: Partial<UnitsView>
) {
  if (changeSet) {
    const updates = Object.keys(changeSet)
      .filter((key) => persistable_fields.has(key))
      .reduce((cur, key) => {
        return Object.assign(cur, { [key]: changeSet[key] });
      }, {});
    const { data, error } = await tableUpdate("units", {
      changes: updates,
      id: unit.id,
    });
  }
}

async function insertNewUnit(unit: UnitsView) {
  const inserts = Object.keys(unit)
    .filter((key) => persistable_fields.has(key))
    .reduce((cur, key) => {
      return Object.assign(cur, { [key]: unit[key] });
    }, {});
  const { data, error }: PostgrestResponse<UnitsView> = await pg
    .from("units")
    .insert([inserts]);
  return data[0];
}

/* 
Function to handle changes to Units! This is a bit complicated because of the 
one to many relationship between a unit and environments, lithologies, and strat_names.
*/
export async function persistUnitChanges(
  unit: UnitsView,
  updatedModel: UnitsView,
  changeSet: Partial<UnitsView>
) {
  console.log(unit, updatedModel, changeSet);

  await updateExistingUnit(unit, updatedModel, changeSet);

  if (changeSet?.environ_unit) {
    await handleEnvironCollection(
      unit.environ_unit ?? [],
      changeSet.environ_unit,
      unit.id
    );
  }
  if (changeSet?.lith_unit) {
    await handleLithCollection(
      unit.lith_unit ?? [],
      changeSet.lith_unit,
      unit.id
    );
  }
  if (changeSet?.strat_names) {
    await handleStratNameCollection(
      unit.strat_names ?? [],
      changeSet.strat_names,
      unit.id
    );
  }
  return updatedModel;
}

export async function persistNewUnit(
  unit: UnitsView,
  updatedModel: UnitsView,
  changeSet: Partial<UnitsView>
) {
  const { id } = await insertNewUnit(updatedModel);
  unit.id = id;
  updatedModel.id = id;
  console.log(updatedModel);

  if (updatedModel?.environ_unit) {
    updatedModel.environ_unit.map(async (env) => {
      const { data, error } = await pg
        .from("unit_environs")
        .insert([{ unit_id: updatedModel.id, environ_id: env.id }]);
    });
  }
  if (updatedModel?.lith_unit) {
    updatedModel.lith_unit.map(async (lith) => {
      const { data, error } = await pg
        .from("unit_liths")
        .insert([
          { unit_id: updatedModel.id, lith_id: lith.id, dom: lith.dom },
        ]);
    });
  }
  if (updatedModel?.strat_names) {
    updatedModel.strat_names.map(async (strat_name) => {
      const { data, error } = await pg
        .from("unit_strat_names")
        .insert([{ unit_id: updatedModel.id, strat_name_id: strat_name.id }]);
    });
  }
  return updatedModel;
}
