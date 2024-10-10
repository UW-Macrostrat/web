import { AnnotateBlendTag, TextAnnotateBlend } from "react-text-annotate-blend";
import { InternalEntity } from "./types";
import { TreeDispatch } from "./edit-state";
import h from "./feedback.module.sass";
import { buildHighlights } from "#/integrations/xdd/extractions/lib";
import { Highlight } from "#/integrations/xdd/extractions/lib/types";
import { useCallback } from "react";
import { asChromaColor } from "@macrostrat/color-utils";

export interface FeedbackTextProps {
  text: string;
  selectedNodes: number[];
  nodes: InternalEntity[];
  updateNodes: (nodes: string[]) => void;
  dispatch: TreeDispatch;
}

function buildTags(
  highlights: Highlight[],
  selectedNodes: number[]
): AnnotateBlendTag[] {
  return highlights.map((highlight) => {
    console.log(selectedNodes);
    const isSelected =
      selectedNodes.includes(highlight.id) || selectedNodes.length === 0;
    let color = highlight.backgroundColor;
    if (!isSelected) {
      color = asChromaColor(color).alpha(0.2).css();
    }

    return {
      color,
      markStyle: {
        border: "1px solid #444",
        borderRadius: "0.25em",
        borderColor: highlight.borderColor,
      },
      ...highlight,
    };
  });
}

export function FeedbackText(props: FeedbackTextProps) {
  // Convert input to tags
  const { text, selectedNodes, nodes, updateNodes, dispatch } = props;
  let allTags: AnnotateBlendTag[] = buildTags(
    buildHighlights(nodes),
    selectedNodes
  );

  const onChange = useCallback(
    (ids) => {
      const currentIds = allTags.map((d) => d.id);
      const updatedIds = ids.map((d) => d.id);
      /* Find the id that was removed: that is the one that will be selected
       (we are hijacking the 'click to delete' functionality to select instead) */
      const removedIds = currentIds.filter((d) => !updatedIds.includes(d));
      if (removedIds.length > 0) {
        dispatch({ type: "select-node", payload: { ids: removedIds } });
      }
    },
    [allTags]
  );

  return h(TextAnnotateBlend, {
    style: {
      fontSize: "1.2rem",
    },
    className: "feedback-text",
    content: text,
    onChange,
    value: allTags,
  });
}
