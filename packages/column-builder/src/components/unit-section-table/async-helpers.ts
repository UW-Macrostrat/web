import { PostgrestError, PostgrestResponse } from "@supabase/postgrest-js";
import pg from "../../db";
import { UnitsView } from "~/types";
import { SectionUnits } from "./reducer";

const createNewSection = async (col_id: number) => {
  const { data, error }: PostgrestResponse<{ id: number; col_id: number }> =
    await pg.from("sections").insert([{ col_id }]);
  return data;
};

const saveColumnReorder = async (sections: SectionUnits) => {
  // multiple things need to be done here.
  // We need to go through and set the section_id for each unit as well as the p_bottom
  // this will run in o(n) time, where n is the number of units
  let position_bottom = 1;
  const updates: { id: number; section_id: number; position_bottom: number }[] =
    [];
  sections.map((section) => {
    const section_id = parseInt(Object.keys(section)[0]);
    const units = section[section_id];
    console.log("p_b", position_bottom);
    units.map((unit) => {
      console.log("p_b", position_bottom);
      updates.push({ id: unit.id, section_id, position_bottom });
      //increment p_bottom for next unit
      position_bottom = position_bottom + 1;
    });
  });
  updates.map(async (update) => {
    const { id, position_bottom, section_id } = update;
    const { data, error }: PostgrestResponse<UnitsView> = await pg
      .from("units")
      .update({ position_bottom, section_id })
      .match({ id });
  });
};

export { createNewSection, saveColumnReorder };
