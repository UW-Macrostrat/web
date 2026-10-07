/** Free text cut to a few lines, with a control to read the rest. The control
 * appears only when the text actually overflows its allowance. */
import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";
import { ReactNode, useEffect, useRef, useState } from "react";

const h = hyper.styled(styles);

interface ClampedTextProps {
  text: string;
  /** Lines shown while clipped */
  lines?: number;
  /** Inline lead-in, such as a field label, sharing the first line */
  prefix?: ReactNode;
}

export function ClampedText(props: ClampedTextProps) {
  const { text, lines = 3, prefix = null } = props;
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  // A new text starts clipped again
  useEffect(() => {
    setExpanded(false);
  }, [text]);

  // Measured only while clipped: an expanded paragraph never overflows itself
  useEffect(() => {
    if (expanded) return;
    const el = ref.current;
    if (el == null) return;
    setOverflows(el.scrollHeight > el.clientHeight + 1);
  }, [text, lines, expanded]);

  let tag = "p.clamped-text";
  if (!expanded) tag += ".is-clamped";

  let toggle = null;
  if (overflows) {
    const label = expanded ? "Show less" : "Show more";
    toggle = h(
      "button.text-control.clamp-toggle",
      { type: "button", onClick: () => setExpanded(!expanded) },
      label
    );
  }

  return h("div.clamped-text-holder", [
    h(tag, { ref, style: { "--clamp-lines": lines } }, [prefix, text]),
    toggle,
  ]);
}
