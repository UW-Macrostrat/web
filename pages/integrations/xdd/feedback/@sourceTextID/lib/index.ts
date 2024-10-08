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
