/** Slot comments in plain markdown, kept as empty markers.
 *
 *   <!-- slot: SupportersGrid — Site/data/supporters.yml -->
 *
 * becomes
 *
 *   <div data-slot-marker="SupportersGrid"></div>
 *
 * Comments are otherwise dropped on render, so this is how a site page learns
 * where in the prose its author put a component. The name is the first word
 * after `slot:`; the rest of the comment is a note for the author.
 */

const SLOT_COMMENT = /^<!--\s*slot:\s*([A-Za-z]\w*)[\s\S]*-->\s*$/;

interface Node {
  type: string;
  value?: string;
  children?: Node[];
  data?: Record<string, unknown>;
}

function visit(node: Node): void {
  for (const child of node.children ?? []) {
    if (child.type === "html" && typeof child.value === "string") {
      const match = SLOT_COMMENT.exec(child.value.trim());
      if (match != null) {
        child.type = "slotMarker";
        delete child.value;
        child.children = [];
        child.data = { hName: "div", hProperties: { dataSlotMarker: match[1] } };
        continue;
      }
    }
    visit(child);
  }
}

export default function remarkSlotMarkers() {
  return (tree: Node) => visit(tree);
}
