import { AnnotateBlendTag, TextAnnotateBlend } from "react-text-annotate-blend";
import { InternalEntity } from "./types";
import { TreeDispatch } from "./edit-state";
import h from "./feedback.module.sass";
import { buildHighlights } from "#/integrations/xdd/extractions/lib";
import { Highlight } from "#/integrations/xdd/extractions/lib/types";
import { useCallback } from "react";
import { getTagStyle } from "#/integrations/xdd/extractions/lib";

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
    const highlighted = isHighlighted(highlight, selectedNodes);
    const active = isActive(highlight, selectedNodes);

    return {
      markStyle: {
        ...getTagStyle(highlight.backgroundColor, { highlighted, active }),
        borderRadius: "0.2em",
        padding: "0.1em",
        borderWidth: "1.5px",
        cursor: "pointer",
      },
      tagStyle: {
        display: "none",
      },
      ...highlight,
    };
  });
}

function isActive(tag: Highlight, selectedNodes: number[]) {
  return selectedNodes.includes(tag.id);
}

function isHighlighted(tag: Highlight, selectedNodes: number[]) {
  if (selectedNodes.length === 0) return true;
  return (
    (selectedNodes.includes(tag.id) ||
      tag.parents?.some((d) => selectedNodes.includes(d))) ??
    false
  );
}

export function FeedbackText(props: FeedbackTextProps) {
  // Convert input to tags
  const { text, selectedNodes, nodes, dispatch } = props;
  let allTags: AnnotateBlendTag[] = buildTags(
    buildHighlights(nodes, null),
    selectedNodes
  );

  const onChange = useCallback(
    (tags) => {
      // New tags
      console.log(tags);
      const newTags = tags.filter((d) => !("id" in d));
      if (newTags.length > 0) {
        const { start, end } = newTags[0];
        const payload = { start, end, text: text.slice(start, end) };
        dispatch({ type: "create-node", payload });
        return;
      }

      const tagIDs = new Set(tags.map((d) => d.id));
      const removedIds = allTags.map((d) => d.id).filter((d) => !tagIDs.has(d));

      /* Find the id that was removed: that is the one that will be selected
       (we are hijacking the 'click to delete' functionality to select instead) */
      if (removedIds.length > 0) {
        dispatch({
          type: "toggle-node-selected",
          payload: { ids: removedIds },
        });
      }
    },
    [allTags, text]
  );

  return h(TextAnnotateBlend, {
    style: {
      fontSize: "1.2em",
    },
    className: "feedback-text",
    content: text,
    onChange,
    value: allTags,
  });
}
