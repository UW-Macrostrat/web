import React from "react";
import { AnnotateBlendTag, TextAnnotateBlend } from "react-text-annotate-blend";
import { TextData, TreeData } from "./types";

/*
Stateful example with blended tags allowed
*/

type RANGE_TO_LEVEL = {
  [range: string]: string;
};

type COLOR_TYPE = {
  [key: string]: string;
  strat_name: string;
  lithology: string;
  lith_att: string;
};

const COLORS: COLOR_TYPE = {
  strat_name: "rgb(179, 245, 66)",
  lithology: "#42f5f5",
  lith_att: "#4b46cd",
  gray: "#D3D3D3",
};

type NAME_TO_LEVEL_TYPE = {
  [key: string]: number;
  strat_name: number;
  lithology: number;
  lith_att: number;
};

const NAME_TO_LEVEL: NAME_TO_LEVEL_TYPE = {
  strat_name: 0,
  lithology: 1,
  lith_att: 2,
};

type LEVEL_TO_NAME_TYPE = {
  [key: number]: string;
  0: string;
  1: string;
  2: string;
};

const LEVEL_TO_NAME: LEVEL_TO_NAME_TYPE = {
  0: "strat_name",
  1: "lithology",
  2: "lith_att",
};

export interface StatefulBlendProps {
  formatted_text: TextData;
  nodes_to_show: string[];
  tree_data: TreeData[];
  update_nodes: (nodes: string[]) => void;
}

function perform_dfs(
  current_node: TreeData,
  paragraph: string,
  all_tags: AnnotateBlendTag[],
  nodes_to_show: Set<string>,
  mapping: RANGE_TO_LEVEL
) {
  // Extract the data
  let parts = current_node.id.split("_");
  let level = parseInt(parts[0]);
  let start_idx = parseInt(parts[1]);
  let end_idx = parseInt(parts[2]);
  mapping[start_idx + "_" + end_idx] = "" + level;

  // Determine if this node is selected or not
  let tag: string = "";
  let node_color: string = COLORS["gray"];
  if (nodes_to_show.has(current_node.id)) {
    // Record this node
    tag = LEVEL_TO_NAME[level];
    node_color = COLORS[tag];
  }

  all_tags.push({
    start: start_idx,
    end: end_idx,
    text: paragraph.substring(start_idx, end_idx),
    tag: tag,
    color: node_color,
  });

  // Record the children
  if (current_node.children) {
    for (var node of current_node.children) {
      perform_dfs(node, paragraph, all_tags, nodes_to_show, mapping);
    }
  }
}

export function StatefulBlend(props: StatefulBlendProps) {
  // Convert input to tags
  let nodes_set: Set<string> = new Set<string>(props.nodes_to_show);
  let all_tags: AnnotateBlendTag[] = [];
  let mapping: RANGE_TO_LEVEL = {};
  for (var data of props.tree_data) {
    perform_dfs(
      data,
      props.formatted_text.paragraph_text,
      all_tags,
      nodes_set,
      mapping
    );
  }

  let [editMode, setEditMode] = React.useState(false);

  const tag = "strat_name";
  const handleChange = (tagged_words: AnnotateBlendTag[]) => {
    if (!editMode) {
      return;
    }

    console.log("Tagged words: ", tagged_words);

    let nodes_to_keep: string[] = [];
    for (var curr_word of tagged_words) {
      // Get the word level
      let word_level: string = "0";
      let search_key: string =
        curr_word.start.toString() + "_" + curr_word.end.toString();
      if (search_key in mapping) {
        word_level = mapping[search_key];
      }

      // Record the node
      let node_id = word_level + "_" + search_key;
      nodes_to_keep.push(node_id);
    }

    props.update_nodes(nodes_to_keep);
  };

  return (
    <div style={{ padding: 20 }}>
      <p>
        Use the below button to enable/disable edit mode. In edit mode, you can
        either single or range select words to create new entities and double
        click on existing entities to remove them from the heirachy.
      </p>

      <button onClick={() => setEditMode(!editMode)}>
        {editMode ? "Disable edit mode" : "Enable edit mode"}
      </button>

      <p></p>
      <TextAnnotateBlend
        style={{
          fontSize: "1.2rem",
        }}
        content={props.formatted_text.paragraph_text}
        onChange={handleChange}
        value={all_tags}
        getSpan={(span) => ({
          ...span,
          tag: tag,
          color: COLORS[tag],
        })}
      />
    </div>
  );
}
