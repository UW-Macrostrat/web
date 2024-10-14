import h from "./feedback.module.sass";
import { Tree, TreeApi } from "react-arborist";
import Node from "./node";
import { FeedbackText } from "./text-visualizer";
import { Entity, InternalEntity, TreeData } from "./types";
import { ModelInfo } from "#/integrations/xdd/extractions/lib";
import { useUpdatableTree } from "./edit-state";
import { useEffect, useRef, useState } from "react";
import { DataField } from "~/components/unit-details";
import { ButtonGroup, Card } from "@blueprintjs/core";
import { OmniboxSelector } from "./type-selector";
import { CancelButton, SaveButton } from "@macrostrat/ui-components";

export interface FeedbackComponentProps {
  // Add props here
}

function setsAreTheSame<T>(a: Set<T>, b: Set<T>) {
  if (a.size !== b.size) return false;
  for (const item of a) {
    if (!b.has(item)) return false;
  }
  return true;
}

export function FeedbackComponent({
  entities = [],
  text,
  model,
  entityTypes,
  sourceTextID,
  runID,
}) {
  // Get the input arguments

  const [state, dispatch] = useUpdatableTree(
    entities.map(processEntity),
    entityTypes
  );

  const { selectedNodes, tree, selectedEntityType } = state;

  return h("div", [
    h(FeedbackText, {
      text,
      dispatch,
      nodes: tree,
      selectedNodes,
    }),
    h(ModelInfo, { data: model }),
    h("div.entity-panel", [
      h(Card, { className: "control-panel" }, [
        h(
          ButtonGroup,
          {
            vertical: true,
            fill: true,
            minimal: true,
            alignText: "left",
          },
          [
            h(
              CancelButton,
              {
                icon: "trash",
                disabled: state.initialTree == state.tree,
                onClick() {
                  dispatch({ type: "reset" });
                },
              },
              "Reset"
            ),
            h(
              SaveButton,
              {
                onClick() {
                  dispatch({
                    type: "save",
                    tree,
                    sourceTextID: sourceID,
                    runID: runID,
                  });
                },
                disabled: state.initialTree == state.tree,
              },
              "Save"
            ),
          ]
        ),
        h(EntityTypeSelector, {
          entityTypes,
          selected: selectedEntityType,
          onChange(payload) {
            dispatch({ type: "select-entity-type", payload });
          },
        }),
      ]),
      h(ManagedSelectionTree, {
        selectedNodes,
        dispatch,
        tree,
      }),
    ]),
  ]);
}

function processEntity(entity: Entity): InternalEntity {
  return {
    ...entity,
    term_type: entity.type.name,
    txt_range: [entity.indices],
    children: entity.children?.map(processEntity) ?? [],
  };
}

function EntityTypeSelector({ entityTypes, selected, onChange }) {
  const [isOpen, setOpen] = useState(false);
  // Show all entity types when selected is null
  const _selected = selected != null ? selected : undefined;
  return h(DataField, { label: "Entity type", inline: true }, [
    h(
      "code.bp5-code",
      {
        onClick() {
          setOpen((d) => !d);
        },
      },
      selected.name
    ),
    h(OmniboxSelector, {
      isOpen,
      items: Array.from(entityTypes.values()),
      selectedItem: _selected,
      onSelectItem(item) {
        setOpen(false);
        onChange(item);
      },
      onClose() {
        setOpen(false);
      },
    }),
  ]);
}

function ManagedSelectionTree(props) {
  const { selectedNodes, dispatch, tree, ...rest } = props;

  const ref = useRef<TreeApi<TreeData>>();

  useEffect(() => {
    if (ref.current == null) return;
    // Check if selection matches current
    const selection = new Set(selectedNodes.map((d) => d.toString()));
    const currentSelection = ref.current.selectedIds;
    if (setsAreTheSame(selection, currentSelection)) return;
    // If the selection is the same, do nothing

    // Set selection
    ref.current.setSelection({
      ids: selectedNodes.map((d) => d.toString()),
      anchor: null,
      mostRecent: null,
    });
  }, [selectedNodes]);

  return h(Tree, {
    className: "selection-tree",
    ref,
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
  });
}
