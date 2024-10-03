import { useRef, useState } from "react";
import { NodeApi, Tree } from "react-arborist";
import Node from "./Node";
import { StatefulBlend } from "./TextVisualizer";
import { getExampleData } from "./data_fetcher";
import { recordFeedback } from "./feedback_recorder";
import { Entity, Result, TextData, TreeData } from "./types";

function process_entity(
  paragraph: TextData,
  entity: Entity,
  depth: number
): TreeData {
  // Record its children
  let curr_children: TreeData[] = [];
  if (entity.children) {
    for (var child of entity.children) {
      curr_children.push(process_entity(paragraph, child, depth + 1));
    }
  }

  // Create the current node
  let entity_tag = "" + depth;
  return {
    id:
      entity_tag + "_" + entity.txt_range[0][0] + "_" + entity.txt_range[0][1],
    name: paragraph.paragraph_text.substring(
      entity.txt_range[0][0],
      entity.txt_range[0][1]
    ),
    children: curr_children,
  };
}

function formatForVisualization(initial_tree: Result): [TextData, TreeData[]] {
  let paragraph: TextData = initial_tree.text;
  let tree_entities: TreeData[] = [];
  if (initial_tree.strats) {
    for (var curr_strat of initial_tree.strats) {
      tree_entities.push(process_entity(paragraph, curr_strat, 0));
    }
  }

  let root: TreeData = {
    id: "root",
    name: "All entities",
    children: tree_entities,
  };

  return [paragraph, [root]];
}

function update_tree(current_node: TreeData, nodes_set: Set<string>) {
  // Update the children
  let new_children: TreeData[] = [];
  for (var curr_child of current_node.children) {
    if (nodes_set.has(curr_child.id)) {
      // We want to keep this child
      new_children.push(curr_child);
      nodes_set.delete(curr_child.id);
    } else {
      // We don't want to keep this node so make its grand children its child
      for (var grand_child of curr_child.children) {
        nodes_set.delete(grand_child.id);
        new_children.push(grand_child);
      }
    }
  }

  // Call update on each of the children
  for (var curr_new_child of new_children) {
    update_tree(curr_new_child, nodes_set);
  }

  // Update the children of this node
  current_node.children = new_children;
}

function perform_reset(node: TreeData, depth: number) {
  // Reset the depth
  let old_id_parts = node.id.split("_");
  let new_id = depth.toString() + "_" + old_id_parts[1] + "_" + old_id_parts[2];
  node.id = new_id;

  for (var child of node.children) {
    perform_reset(child, depth + 1);
  }
}

function removeNodes(
  current_node: TreeData,
  nodes_to_remove: Set<string>,
  removed_nodes: TreeData[]
) {
  let new_children: TreeData[] = [];
  for (var curr_child of current_node.children) {
    if (nodes_to_remove.has(curr_child.id)) {
      // Record that we removed this node
      removed_nodes.push(curr_child);
    } else {
      // Keep this child
      new_children.push(curr_child);
    }
  }

  // Process the children
  for (var curr_new_child of new_children) {
    removeNodes(curr_new_child, nodes_to_remove, removed_nodes);
  }

  // Update the children for this node
  current_node.children = new_children;
}

function addInChild(
  current_node: TreeData,
  target_node: string,
  removed_nodes: TreeData[]
) {
  if (current_node.id.valueOf() == target_node.valueOf()) {
    // Add in the children to the target node
    for (var node_to_add of removed_nodes) {
      current_node.children.push(node_to_add);
    }
  } else {
    // This node is not the target node so its a child
    for (var curr_child of current_node.children) {
      addInChild(curr_child, target_node, removed_nodes);
    }
  }
}

function recordNode(node: TreeData, nodes_set: Set<string>) {
  nodes_set.add(node.id);
  for (var child of node.children) {
    recordNode(child, nodes_set);
  }
}

export function FeedbackWrap({ data }) {
  // Get the input arguments
  let input_data: Result = data;
  console.log("Input data of", input_data);
  let [start_text, tree_entities]: [TextData, TreeData[]] =
    formatForVisualization(input_data);
  let no_nodes: string[] = [];
  let intial_show_save: boolean = false;

  // Create state variables
  let [current_tree, setTree] = useState(tree_entities);
  let [nodes_to_show, setNodesToShow] = useState(no_nodes);
  let [current_text, setCurrentText] = useState(start_text);
  let [show_save, setShowSave] = useState(intial_show_save);

  const onGenerateClick = async () => {
    // Get an example
    getExampleData()
      .then((result) => {
        let [start_text, tree_entities]: [TextData, TreeData[]] =
          formatForVisualization(result);
        setTree(tree_entities);
        setNodesToShow([]);
        setCurrentText(start_text);
        setShowSave(true);
      })
      .catch((err_msg) => {
        console.error("on Generate Click error of", err_msg);
      });
  };

  const onSaveClick = async () => {
    recordFeedback(current_text, current_tree)
      .then((result) => {
        onGenerateClick();
      })
      .catch((err_msg) => {
        console.error("On Save Click got error of", err_msg);
      });
  };

  // Processing update from the text visualization
  let process_update = (nodes: string[]) => {
    let nodes_set = new Set<string>(nodes);
    let old_root = current_tree[0];
    let new_root = JSON.parse(JSON.stringify(old_root));

    // Update the tree
    update_tree(new_root, nodes_set);

    // Add the remaining children as
    nodes_set.forEach((node) => {
      // Get the id details
      let node_parts = node.split("_");
      let start_idx: number = parseInt(node_parts[1]);
      let end_idx: number = parseInt(node_parts[2]);

      // Create the new node
      let new_id: string =
        "0_" + start_idx.toString() + "_" + end_idx.toString();
      let name: string = current_text.paragraph_text.substring(
        start_idx,
        end_idx
      );
      new_root.children.push({
        id: new_id,
        name: name,
        children: [],
      });
    });

    // Reset the level of all of nodes
    for (var root_child of new_root.children) {
      perform_reset(root_child, 0);
    }

    setTree([new_root]);
  };

  // If the user rename the tree
  const treeRef = useRef();
  const onMove = ({ dragIds, parentId, index }: any) => {
    // Cast the input data
    let input_children_ids: string[] = dragIds;
    let input_parent_id: string = parentId;
    let input_index: number = index;

    // Create the new root
    let old_root = current_tree[0];
    let new_root = JSON.parse(JSON.stringify(old_root));

    // Remove the children from there location
    let nodes_to_remove: Set<string> = new Set<string>(input_children_ids);
    let removed_nodes: TreeData[] = [];
    let updated_children: TreeData[] = [];
    for (var root_child of new_root.children) {
      if (nodes_to_remove.has(root_child.id)) {
        // Don't record this is a root child
        removed_nodes.push(root_child);
      } else {
        // Record it as a child
        removeNodes(root_child, nodes_to_remove, removed_nodes);
        updated_children.push(root_child);
      }
    }
    new_root.children = updated_children;

    if (input_parent_id == "root") {
      // Add in the children to the root
      for (var node_to_add of removed_nodes) {
        new_root.children.push(node_to_add);
      }
    } else {
      // Add in to the target node
      for (var root_child of new_root.children) {
        addInChild(root_child, input_parent_id, removed_nodes);
      }
    }

    // Reset the level of all of nodes
    for (var root_child of new_root.children) {
      perform_reset(root_child, 0);
    }
    setTree([new_root]);
  };

  const onDelete = ({ ids }: any) => {
    let delete_ids: string[] = ids;

    // Create the new root
    let old_root = current_tree[0];
    let new_root = JSON.parse(JSON.stringify(old_root));

    // Remove the children from there location
    let nodes_to_remove: Set<string> = new Set<string>(delete_ids);
    let removed_nodes: TreeData[] = [];
    let updated_children: TreeData[] = [];
    for (var root_child of new_root.children) {
      if (nodes_to_remove.has(root_child.id)) {
        // Don't record this is a root child
        removed_nodes.push(root_child);
      } else {
        // Record it as a child
        removeNodes(root_child, nodes_to_remove, removed_nodes);
        updated_children.push(root_child);
      }
    }
    new_root.children = updated_children;

    // Reset the level of all of nodes
    for (var root_child of new_root.children) {
      perform_reset(root_child, 0);
    }
    setTree([new_root]);
  };

  const onSelect = (nodes: NodeApi<TreeData>[]) => {
    let nodes_to_show = new Set<string>();
    for (var curr_node of nodes) {
      recordNode(curr_node.data, nodes_to_show);
    }

    setNodesToShow(Array.from(nodes_to_show));
  };

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
        <div>
          <button onClick={onGenerateClick}>Generate random example</button>
          <p></p>
          <p>
            Click on a entity to see its type as well as the type of its
            children. You can also drag and drop entities up and down the
            heirachy, thus changing their type.
          </p>
          {show_save && <button onClick={onSaveClick}>Save result</button>}
          <p></p>
          <Tree
            data={current_tree}
            ref={treeRef}
            onMove={onMove}
            onDelete={onDelete}
            onSelect={onSelect}
          >
            {Node}
          </Tree>
        </div>

        <StatefulBlend
          formatted_text={current_text}
          tree_data={current_tree[0].children}
          update_nodes={process_update}
          nodes_to_show={nodes_to_show}
        />
      </div>
    </>
  );
}

export default FeedbackWrap;
