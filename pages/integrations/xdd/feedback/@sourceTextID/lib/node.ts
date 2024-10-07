import { NodeApi, TreeApi } from "react-arborist";
import { TreeData } from "./types";
import h from "./feedback.module.sass";
import { EntityTag } from "../../../extractions/lib";

function isSelected(search_node: TreeData, tree_node: TreeData) {
  if (search_node.id == tree_node.id) {
    return true;
  }

  for (var child of tree_node.children) {
    if (isSelected(search_node, child)) {
      return true;
    }
  }

  return false;
}

function isNodeSelected(node: NodeApi<TreeData>, tree: TreeApi<TreeData>) {
  for (var selected_node of tree.selectedNodes) {
    if (isSelected(node.data, selected_node.data)) {
      return true;
    }
  }

  return false;
}

function Node({ node, style, dragHandle, tree }: any) {
  let selected: boolean = isNodeSelected(node, tree);

  return h(
    "div.node",
    { style, ref: dragHandle },
    h(EntityTag, { data: node.data })
  );
}

export default Node;
