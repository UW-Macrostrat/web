import { NodeApi, TreeApi } from "react-arborist";
import { TreeData } from "./types";
import h from "./feedback.module.sass";
import { EntityTag } from "../../../extractions/lib";
import { useTreeDispatch } from "./edit-state";

function isSelected(searchNode: TreeData, treeNode: TreeData) {
  return searchNode.id == treeNode.id;
  // We could also select children of the search node here if we wanted to
}

function isNodeHighlighted(node: NodeApi<TreeData>, tree: TreeApi<TreeData>) {
  // We treat no selection as all nodes being active. We may add some nuance later
  if (tree.selectedNodes.length == 0) {
    return true;
  }

  for (const selectedNode of tree.selectedNodes) {
    if (isSelected(node.data, selectedNode.data)) {
      return true;
    }
  }

  // Check if the parent node is highlighted
  if (node.parent != null && isNodeHighlighted(node.parent, tree)) {
    return true;
  }

  return false;
}

function isNodeActive(node: NodeApi<TreeData>, tree: TreeApi<TreeData>) {
  for (const selectedNode of tree.selectedNodes) {
    if (isSelected(node.data, selectedNode.data)) {
      return true;
    }
  }
  return false;
}

function Node({ node, style, dragHandle, tree }: any) {
  let highlighted: boolean = isNodeHighlighted(node, tree);
  let active: boolean = isNodeActive(node, tree);

  const dispatch = useTreeDispatch();

  return h(
    "div.node",
    { style, ref: dragHandle },
    h(EntityTag, {
      data: node.data,
      active,
      highlighted,
      onClickType() {
        dispatch({ type: "toggle-entity-type-selector" });
      },
    })
  );
}

export default Node;
