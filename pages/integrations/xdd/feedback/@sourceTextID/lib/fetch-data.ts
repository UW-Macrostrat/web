import { Entity, Result, ServerRelationship, ServerResponse } from "./types";

function addToMap(
  paragraph_txt: string,
  entity_name: string,
  entity_type: string,
  terms_map: Map<string, Entity>
) {
  // We have already processed this term
  if (terms_map.has(entity_name)) {
    return;
  }

  // Ensure this string actually exists
  let start_idx = paragraph_txt
    .toLowerCase()
    .indexOf(entity_name.toLowerCase());
  if (start_idx == -1) {
    return;
  }
  let end_idx = start_idx + entity_name.length;

  // Create the entity
  let entity_to_add: Entity = {
    term_type: entity_type,
    txt_range: [[start_idx, end_idx]],
    children: [],
  };
  terms_map.set(entity_name, entity_to_add);
}

function mergeChild(
  src_map: Map<string, Entity>,
  dst_map: Map<string, Entity>,
  relationship: ServerRelationship
) {
  // Get the child
  let child_entity: Entity | undefined = dst_map.get(relationship.dst_name);
  if (!child_entity) {
    return;
  }

  // Get the parent
  let parent_entity: Entity | undefined = src_map.get(relationship.src_name);
  if (!parent_entity) {
    return;
  }

  // Merge child with parent
  dst_map.delete(relationship.dst_name);
  parent_entity.children?.push(child_entity);
  src_map.set(relationship.src_name, parent_entity);
}

function convertToTree(responseJson: ServerResponse): Result {
  let strats_map: Map<string, Entity> = new Map();
  let lith_maps: Map<string, Entity> = new Map();
  let att_maps: Map<string, Entity> = new Map();
  let paragraph_txt = responseJson.text.paragraph_text;

  // Create the initial entity
  for (var curr_rel of responseJson.relationships) {
    if (curr_rel.relationship_type == "strat_to_lith") {
      addToMap(paragraph_txt, curr_rel.src_name, "strat_name", strats_map);
      addToMap(paragraph_txt, curr_rel.dst_name, "lith_base", lith_maps);
    } else if (curr_rel.relationship_type == "lith_to_attribute") {
      addToMap(paragraph_txt, curr_rel.src_name, "lith_base", lith_maps);
      addToMap(paragraph_txt, curr_rel.dst_name, "att_base", att_maps);
    }
  }

  // Merge attribute to liths
  for (var curr_rel of responseJson.relationships) {
    if (curr_rel.relationship_type == "lith_to_attribute") {
      mergeChild(lith_maps, att_maps, curr_rel);
    }
  }

  // Merge liths to strats
  for (var curr_rel of responseJson.relationships) {
    if (curr_rel.relationship_type == "strat_to_lith") {
      mergeChild(strats_map, lith_maps, curr_rel);
    }
  }

  // Deal with any provided just entities
  for (var curr_entity of responseJson.just_entities) {
    if (curr_entity.entity_type == "strat_name") {
      addToMap(
        paragraph_txt,
        curr_entity.entity_name,
        curr_entity.entity_type,
        strats_map
      );
    }
  }

  // Create the result
  let result_to_return: Result = {
    text: responseJson.text,
    strats: [],
  };
  strats_map.forEach((value, key, map) => {
    result_to_return.strats?.push(value);
  });
  return result_to_return;
}

export async function getExampleData(): Promise<Result> {
  try {
    const response = await fetch("http://cosmos0003.chtc.wisc.edu:3001/");

    if (response.ok) {
      const responseJson = await response.json();
      let result: Result = convertToTree(responseJson);
      return result;
    } else {
      throw new Error("Failed to get example from server");
    }
  } catch (error) {
    throw error;
  }
}
