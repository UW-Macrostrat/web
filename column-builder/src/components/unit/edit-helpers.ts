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
        .insert([{ unit_id: unit_id, lith_id: change.id, dom: change.prop }]);
    } else {
      // already exists! update!
      const { data, error } = await pg
        .from("unit_liths")
        .update({ dom: change.prop })
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
]);

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
