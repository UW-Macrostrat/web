import { AnnotateBlendTag, TextAnnotateBlend } from "react-text-annotate-blend";
import { InternalEntity } from "./types";
import h from "@macrostrat/hyper";
import { buildHighlights } from "#/integrations/xdd/extractions/lib";
import { Highlight } from "#/integrations/xdd/extractions/lib/types";

export interface FeedbackTextProps {
  text: string;
  selectedNodes: string[];
  nodes: InternalEntity[];
  updateNodes: (nodes: string[]) => void;
}

function buildTags(highlights: Highlight[]): AnnotateBlendTag[] {
  return highlights.map((highlight) => {
    console.log(highlight);
    return {
      color: highlight.backgroundColor,
      ...highlight,
    };
  });
}

export function FeedbackText(props: FeedbackTextProps) {
  // Convert input to tags
  const { text, selectedNodes, nodes, updateNodes } = props;
  let allTags: AnnotateBlendTag[] = buildTags(buildHighlights(nodes));

  const handleChange = (tagged_words: AnnotateBlendTag[]) => {};

  console.log(allTags);

  return h(TextAnnotateBlend, {
    style: {
      fontSize: "1.2rem",
    },
    content: text,
    onChange: handleChange,
    value: allTags,
  });
}
