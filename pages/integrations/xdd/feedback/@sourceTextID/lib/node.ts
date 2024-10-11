import { NodeApi, TreeApi } from "react-arborist";
import { TreeData } from "./types";
import h from "./feedback.module.sass";
import { EntityTag } from "../../../extractions/lib";

function isSelected(searchNode: TreeData, treeNode: TreeData) {
  return searchNode.id == treeNode.id;
  // We could also select children of the search node here if we wanted to
}

function isNodeSelected(node: NodeApi<TreeData>, tree: TreeApi<TreeData>) {
  // We treat no selection as all nodes being active. We may add some nuance later
  if (tree.selectedNodes.length == 0) {
    return true;
  }
  for (const selectedNode of tree.selectedNodes) {
    if (isSelected(node.data, selectedNode.data)) {
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
    h(EntityTag, { data: node.data, selected })
  );
}

export default Node;
