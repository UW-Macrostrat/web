import hyper from "@macrostrat/hyper";
import styles from "./feedback.module.sass";
import { NodeApi, Tree } from "react-arborist";
import Node from "./node";
import { FeedbackText } from "./text-visualizer";
import { Entity, Result, TextData, TreeData, InternalEntity } from "./types";
import { ModelInfo } from "#/integrations/xdd/extractions/lib";
import { useUpdatableTree } from "./edit-state";

const h = hyper.styled(styles);

export interface FeedbackComponentProps {
  // Add props here
}

export function FeedbackComponent({ entities = [], text, model }) {
  // Get the input arguments

  const [state, dispatch] = useUpdatableTree(entities.map(processEntity));

  const { selectedNodes, tree } = state;

  return h("div", [
    h(FeedbackText, {
      text,
      nodes: entities,
      updateNodes() {},
      selectedNodes,
    }),
    h(ModelInfo, { data: model }),
    h("div", [
      h(Tree, {
        data: tree,
        onMove({ dragIds, parentId, index }) {
          dispatch({
            type: "move-node",
            payload: { dragIds, parentId, index },
          });
        },
        onDelete({ ids }) {
          dispatch({ type: "delete-node", payload: { ids } });
        },
        onSelect(nodes) {
          dispatch({ type: "select-node", payload: nodes });
        },
        children: Node,
      }),
    ]),
  ]);
}

function processEntity(entity: Entity): InternalEntity {
  return {
    ...entity,
    term_type: entity.type.name,
    txt_range: [entity.indices],
    children: entity.children?.map(processEntity),
  };
}

function formatForVisualization(data: Result): [TextData, TreeData[]] {
  const { entities, ...text } = data;
  return [text, entities?.map(processEntity)];
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
