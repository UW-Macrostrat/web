import { NodeApi, TreeApi } from "react-arborist";
import { TreeData } from "./types";
import h from "./feedback.module.sass";
import { EntityTag } from "../../../extractions/lib";

function isSelected(searchNode: TreeData, treeNode: TreeData) {
  if (searchNode.id == treeNode.id) {
    return true;
  }

  for (const child of treeNode.children) {
    if (isSelected(searchNode, child)) {
      return true;
    }
  }

  return false;
}

function isNodeSelected(node: NodeApi<TreeData>, tree: TreeApi<TreeData>) {
  console.log(tree.selectedNodes);
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
