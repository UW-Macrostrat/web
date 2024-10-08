import { TreeData } from "./types";
import { Dispatch, useReducer } from "react";

interface TreeState {
  initialTree: TreeData[];
  tree: TreeData[];
  selectedNodes: string[];
}

type TreeAction =
  | { type: "update"; payload: TreeState }
  | {
      type: "move-node";
      payload: { dragIds: string[]; parentId: string; index: number };
    }
  | { type: "delete-node"; payload: { ids: string[] } }
  | { type: "select-node"; payload: { ids: string[] } };

export function useUpdatableTree(
  initialTree: TreeData[]
): [TreeState, Dispatch<TreeAction>] {
  const [state, dispatch] = useReducer(treeReducer, {
    initialTree,
    tree: initialTree,
    selectedNodes: [],
  });

  return [state, dispatch];
}

function treeReducer(state: TreeState, action: TreeAction) {
  console.log(action);
  switch (action.type) {
    case "update":
      return action.payload;
    case "move-node":
      // For each node in the tree, if the node is in the dragIds, remove it from the tree and collect it
      const [newTree, removedNodes] = popNodes(
        state.tree,
        action.payload.dragIds
      );
      // Insert the removed nodes into the new parent
      let collection = newTree;

      if (action.payload.parentId) {
        const newParent = newTree.find(
          (node) => node.id === action.payload.parentId
        );
        if (newParent == null) {
          return state;
        }
        collection = newParent.children;
      }

      collection.splice(action.payload.index, 0, ...removedNodes);
      console.log(state.tree, newTree);

      return { ...state, tree: newTree };
    case "delete-node":
      // For each node in the tree, if the node is in the ids, remove it from the tree
      const [newTree2, _] = popNodes(state.tree, action.payload.ids);
      return { ...state, tree: newTree2 };
    case "select-node":
      // For each node in the tree, if the node is in the ids, select it
      return state;
    default:
      return state;
  }
}

function popNodes(tree: TreeData[], ids: string[]): [TreeData[], TreeData[]] {
  /** Remove nodes with the given ids from the tree and return the new tree and the removed nodes */
  let newTree: TreeData[] = [];
  let removedNodes: TreeData[] = [];

  for (let node of tree) {
    if (ids.includes(node.id)) {
      removedNodes.push(node);
    } else {
      // Recurse into children
      if (node.children) {
        let [newChildren, removedChildren] = popNodes(node.children, ids);
        node.children = newChildren;
        removedNodes.push(...removedChildren);
      }
      newTree.push(node);
    }
  }

  return [newTree, removedNodes];
}
