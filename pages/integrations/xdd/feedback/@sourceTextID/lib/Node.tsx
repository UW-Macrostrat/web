import { NodeApi, TreeApi } from "react-arborist";
import { TreeData } from "./types";

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

type COLOR_TYPE = {
  [key: string]: string;
  0: string;
  1: string;
  2: string;
};

const COLORS: COLOR_TYPE = {
  0: "rgb(179, 245, 66)",
  1: "#42f5f5",
  2: "#4b46cd",
};

const Node = ({ node, style, dragHandle, tree }: any) => {
  let selected: boolean = isNodeSelected(node, tree);
  let node_level: string = node.data.id.split("_")[0];
  let nameStyle = selected ? { backgroundColor: COLORS[node_level] } : {};

  return (
    <div style={{ ...style, ...nameStyle }} ref={dragHandle}>
      {"🍁"}
      {node.data.name}
    </div>
  );
};

export default Node;
