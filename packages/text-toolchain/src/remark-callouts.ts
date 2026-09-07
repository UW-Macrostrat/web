/** Obsidian-style callouts for remark.
 *
 *   > [!note] Optional title
 *   > Body text
 *
 * becomes
 *
 *   <div class="callout" data-callout="note">
 *     <p class="callout-title">Optional title</p>
 *     <p>Body text</p>
 *   </div>
 *
 * The fold marker (`[!note]+` / `[!note]-`) is accepted and ignored. Blockquotes
 * without a marker are left untouched. Works in both markdown and MDX mode
 * because it only annotates the mdast tree with hast hints.
 */

const MARKER = /^\[!([A-Za-z][\w-]*)\]([+-])?[ \t]*/;

interface Node {
  type: string;
  children?: Node[];
  value?: string;
  data?: Record<string, unknown>;
}

function titleCase(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function transformCallout(node: Node): void {
  const [first] = node.children ?? [];
  if (first?.type !== "paragraph") return;
  const [text] = first.children ?? [];
  if (text?.type !== "text" || typeof text.value !== "string") return;
  const match = MARKER.exec(text.value);
  if (match == null) return;

  const kind = match[1].toLowerCase();
  const rest = text.value.slice(match[0].length);
  const newline = rest.indexOf("\n");
  let title: string;
  let body: string;
  if (newline === -1) {
    title = rest;
    body = "";
  } else {
    title = rest.slice(0, newline);
    body = rest.slice(newline + 1);
  }
  title = title.trim();
  if (title === "") title = titleCase(kind);

  // Remove the marker line from the first paragraph, dropping the paragraph
  // entirely when nothing but the marker was on it.
  text.value = body;
  if (body === "" ) {
    first.children!.shift();
    if (first.children!.length > 0 && first.children![0].type === "break") {
      first.children!.shift();
    }
  }
  const children = node.children!;
  if (first.children!.length === 0) children.shift();

  const titleNode: Node = {
    type: "paragraph",
    data: { hName: "p", hProperties: { className: ["callout-title"] } },
    children: [{ type: "text", value: title }],
  };
  children.unshift(titleNode);

  node.data = {
    ...(node.data ?? {}),
    hName: "div",
    hProperties: { className: ["callout"], "data-callout": kind },
  };
}

function walk(node: Node): void {
  if (node.type === "blockquote") transformCallout(node);
  for (const child of node.children ?? []) walk(child);
}

export default function remarkCallouts() {
  return (tree: Node) => {
    walk(tree);
  };
}
