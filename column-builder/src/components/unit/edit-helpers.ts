import pg, {
  UnitsView,
  tableInsertMany,
  tableUpdate,
  EnvironUnit,
  LithUnit,
} from "../..";
import { conductChangeSet, detectDeletionsAndAdditions } from "../helpers";

/* 
handles insertions and deletions for
the one to many relationship between units and envs/liths
*/
async function handleCollections(
  table: string,
  column: string,
  unit_id: number,
  collection: EnvironUnit[] | LithUnit[],
  collectionChanges: EnvironUnit[] | LithUnit[]
) {
  const { deletions, additions } = detectDeletionsAndAdditions(
    collection,
    collectionChanges
  );

  if (additions.length > 0) {
    const inserts = additions.map((i) => {
      return { unit_id, [column]: i };
    });
    const { data, error } = await tableInsertMany(table, inserts);
  }
  if (deletions.length > 0) {
    const { data, error } = await pg
      .from(table)
      .delete()
      .in(column, deletions)
      .match({ unit_id });
  }
}

/* 
Function to handle changes to Units! This is a bit complicated because of the 
one to many relationship between a unit and environments and lithologies. We need to
conduct a small algorithm to figure out if any envs or liths with either deleted 
or added and then handle those changes
*/
export async function persistUnitChanges(
  unit: UnitsView,
  updatedModel: UnitsView,
  changeSet: Partial<UnitsView>
) {
  if (changeSet) {
    const changes = conductChangeSet(unit, changeSet);
    const { data, error } = await tableUpdate("units", {
      changes,
      id: unit.id,
    });
  }

  if (changeSet?.environ_unit) {
    await handleCollections(
      "unit_environs",
      "environ_id",
      unit.id,
      unit.environ_unit ?? [],
      changeSet.environ_unit
    );
  }
  if (changeSet?.lith_unit) {
    await handleCollections(
      "unit_liths",
      "lith_id",
      unit.id,
      unit.lith_unit ?? [],
      changeSet.lith_unit
    );
  }
  return updatedModel;
}
