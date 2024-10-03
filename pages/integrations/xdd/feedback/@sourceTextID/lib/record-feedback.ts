import {
  RunEntity,
  RunRecord,
  RunRelationship,
  RunSource,
  RunText,
  TextData,
  TreeData,
} from "./types";

type LEVEL_TO_NAME_TYPE = {
  [key: number]: string;
  0: string;
  1: string;
  2: string;
};

const LEVEL_TO_NODE_NAME: LEVEL_TO_NAME_TYPE = {
  0: "strat_name",
  1: "lith",
  2: "lith_att",
};

const LEVEL_TO_RELATIONSHIP_NAME: LEVEL_TO_NAME_TYPE = {
  0: "strat_to_lith",
  1: "lith_to_attribute",
  2: "",
};

function get_node_type(node: TreeData, map: LEVEL_TO_NAME_TYPE): string {
  let id_parts: string[] = node.id.split("_");
  let level = parseInt(id_parts[0]);
  return map[level];
}

function runDFS(
  node: TreeData,
  relationships: RunRelationship[],
  processed_nodes: Set<string>
) {
  // We reached a leaf node
  if (node.children.length == 0) {
    return;
  }

  // Not a valid relationship type
  let relationship_type = get_node_type(node, LEVEL_TO_RELATIONSHIP_NAME);
  if (relationship_type.length == 0) {
    return;
  }

  let src_name: string = node.name;
  processed_nodes.add(src_name);
  for (var child_node of node.children) {
    // Record the relationship
    relationships.push({
      src: src_name,
      dst: child_node.name,
      relationship_type: relationship_type,
    });
    processed_nodes.add(child_node.name);

    runDFS(child_node, relationships, processed_nodes);
  }
}

function getDateString(): string {
  let datetime = new Date();
  let year = datetime.getFullYear();
  let month = String(datetime.getMonth() + 1).padStart(2, "0");
  let day = String(datetime.getDate()).padStart(2, "0");
  let hours = String(datetime.getHours()).padStart(2, "0");
  let minutes = String(datetime.getMinutes()).padStart(2, "0");
  let seconds = String(datetime.getSeconds()).padStart(2, "0");
  let milliseconds = String(datetime.getMilliseconds()).padStart(3, "0");

  return `${year}-${month}-${day}_${hours}:${minutes}:${seconds}.${milliseconds}`;
}

export async function recordFeedback(
  text: TextData,
  tree: TreeData[]
): Promise<boolean> {
  let root_node: TreeData = tree[0];
  let processed_nodes: Set<string> = new Set<string>();
  let relationships: RunRelationship[] = [];
  // Extract relationships by dfs the tree
  for (var node of root_node.children) {
    runDFS(node, relationships, processed_nodes);
  }

  let just_entities: RunEntity[] = [];
  for (var node of root_node.children) {
    // Only record the strats
    let node_type = get_node_type(node, LEVEL_TO_NODE_NAME);
    if (node_type != LEVEL_TO_NODE_NAME[0]) {
      just_entities.push({
        entity: node.name,
        entity_type: node_type,
      });
    }
  }

  // Create the result
  let run_text: RunText = {
    preprocessor_id: text.preprocessor_id,
    paper_id: text.paper_id,
    hashed_text: text.hashed_text,
    weaviate_id: text.weaviate_id,
    paragraph_text: text.paragraph_text,
  };

  let run_source: RunSource = {
    text: run_text,
    relationships: relationships,
    just_entities: just_entities,
  };

  let date_string: string = getDateString();
  let run_id = "storybook_cosmos0003_user_feedback_" + date_string;
  let user_name = "storybook_cosmos003_feedback_user_" + date_string;
  let run_to_record: RunRecord = {
    run_id: run_id,
    extraction_pipeline_id: text.extraction_pipeline_id,
    user_name: user_name,
    model_id: text.model_id,
    results: [run_source],
  };

  // Make the fetch request
  let requestOptions = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(run_to_record),
  };
  console.log("Sending request of", run_to_record);

  try {
    // Make sure the response is okay
    const response = await fetch(
      "http://cosmos0003.chtc.wisc.edu:9543/record_run",
      requestOptions
    );
    if (!response.ok) {
      throw new Error(
        "Server returned response code of " + response.status.toString()
      );
    }

    return true;
  } catch (error) {
    throw error;
  }
}
