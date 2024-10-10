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
      nodes: tree,
      updateNodes() {},
      selectedNodes,
    }),
    h(ModelInfo, { data: model }),
    h(Tree, {
      data: tree,
      onMove({ dragIds, parentId, index }) {
        dispatch({
          type: "move-node",
          payload: {
            dragIds: dragIds.map((d) => parseInt(d)),
            parentId: parentId ? parseInt(parentId) : null,
            index,
          },
        });
      },
      onDelete({ ids }) {
        dispatch({
          type: "delete-node",
          payload: { ids: ids.map((d) => parseInt(d)) },
        });
      },
      onSelect(nodes) {
        const ids = nodes.map((d) => parseInt(d.id));
        dispatch({ type: "select-node", payload: { ids } });
      },
      children: Node,
      idAccessor(d: TreeData) {
        return d.id.toString();
      },
    }),
  ]);
}

function _Tree({ data, onMove, onDelete, onSelect, children }) {
  /* Tree that allows integer IDs for nodes */
  return h(Tree, {
    data: data,
    onMove,
    onDelete,
    onSelect,
    children,
  });
}

function processEntity(entity: Entity): InternalEntity {
  return {
    ...entity,
    term_type: entity.type.name,
    txt_range: [entity.indices],
    children: entity.children?.map(processEntity) ?? [],
  };
}
