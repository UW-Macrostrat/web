/** Editing the compilation graph from the browser page. Admin only.
 *
 * The page hides these controls from anyone without the `web_admin` role; the
 * authorization that matters is on the endpoint (api-v3 `PATCH /compilations`,
 * gated by `require_admin`). Gestures build a draft; **Review** lists what it
 * would change and saves it as one batch. A save writes the edges only —
 * `macrostrat topo update` is what makes them take effect, so the page says so
 * until dismissed.
 */

import {
  Button,
  ButtonGroup,
  Callout,
  Dialog,
  DialogBody,
  DialogFooter,
  FormGroup,
  InputGroup,
  MenuItem,
  Switch,
  Tag,
} from "@blueprintjs/core";
import { Suggest, type ItemPredicate } from "@blueprintjs/select";
import hyper from "@macrostrat/hyper";
import { useAtom, useAtomValue, useSetAtom, useStore } from "jotai";
import { useMemo, useState } from "react";
import { useIsAdmin } from "~/_utils/is-admin";

import {
  fetchCompilationGraph,
  nodeName,
  saveDraft,
  SaveRefused,
  ScaleFilter,
  type Change,
  type GraphNode,
  type SaveProblem,
} from "~/components/compilation-tree";

import {
  editAtoms,
  focusNodeAtom,
  graphAtom,
  graphVersionAtom,
  treeAtoms,
} from "./state";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

/* ---------------------------------------------------------------- toolbar */

/** Beneath the search box: the scale filter, the served-at-top switch, and —
 * for an admin — the edit controls. */
export function CompilationToolbar() {
  const isAdmin = useIsAdmin();
  const [servedAtTop, setServedAtTop] = useAtom(treeAtoms.servedAtTop);

  let editControls = null;
  if (isAdmin) editControls = h(EditControls);

  return h("div.compilation-toolbar", [
    h(ScaleFilter, { atoms: treeAtoms }),
    h(Switch, {
      className: "served-switch",
      label: "Served compilations at top level",
      checked: servedAtTop,
      onChange: () => setServedAtTop(!servedAtTop),
    }),
    editControls,
    h(TopoUpdateBanner),
  ]);
}

function EditControls() {
  const [editing, setEditing] = useAtom(editAtoms.editing);
  const changes = useAtomValue(editAtoms.changes);
  const discard = useSetAtom(editAtoms.discard);
  const [reviewing, setReviewing] = useState(false);

  if (!editing) {
    return h(
      Button,
      { small: true, icon: "edit", onClick: () => setEditing(true) },
      "Edit compilations"
    );
  }

  const n = changes.length;
  let countLabel = "No changes";
  if (n === 1) countLabel = "1 change";
  if (n > 1) countLabel = `${n} changes`;

  let doneTitle = "Leave edit mode";
  let countIntent: "none" | "warning" = "none";
  if (n > 0) {
    doneTitle = "Save or discard your changes first";
    countIntent = "warning";
  }

  return h("div.edit-controls", [
    h("div.edit-bar", [
      h(Tag, { minimal: true, intent: countIntent }, countLabel),
      h(ButtonGroup, [
        h(
          Button,
          {
            small: true,
            intent: "primary",
            icon: "floppy-disk",
            disabled: n === 0,
            onClick: () => setReviewing(true),
          },
          "Review…"
        ),
        h(
          Button,
          { small: true, disabled: n === 0, onClick: discard },
          "Discard"
        ),
        h(
          Button,
          {
            small: true,
            disabled: n > 0,
            title: doneTitle,
            onClick: () => setEditing(false),
          },
          "Done"
        ),
      ]),
    ]),
    h(
      "p.edit-hint",
      "Drag a map onto a compilation to add it, or onto a map to join its tier. " +
        "Hold Alt to copy rather than move."
    ),
    h(EditNotice),
    h(SaveDialog, { isOpen: reviewing, onClose: () => setReviewing(false) }),
  ]);
}

function EditNotice() {
  const [notice, setNotice] = useAtom(editAtoms.notice);
  if (notice == null) return null;
  return h(
    Callout,
    { intent: "danger", icon: "disable", className: "edit-notice" },
    [
      notice,
      h(Button, {
        minimal: true,
        small: true,
        icon: "cross",
        onClick: () => setNotice(null),
      }),
    ]
  );
}

function TopoUpdateBanner() {
  const [needed, setNeeded] = useAtom(editAtoms.needsTopoUpdate);
  if (!needed) return null;
  return h(
    Callout,
    { intent: "warning", icon: "refresh", className: "topo-banner" },
    [
      h("p", [
        "Saved. Run ",
        h("code", "macrostrat topo update"),
        " for the change to reach tiles and lookups.",
      ]),
      h(
        Button,
        { small: true, minimal: true, onClick: () => setNeeded(false) },
        "Dismiss"
      ),
    ]
  );
}

/* ----------------------------------------------------------------- review */

function SaveDialog({ isOpen, onClose }) {
  const changes = useAtomValue(editAtoms.changes);
  const save = useSave(onClose);

  let problems = null;
  if (save.problems != null) {
    problems = h(ProblemList, { problems: save.problems });
  }

  let error = null;
  if (save.error != null) {
    error = h(
      Callout,
      { intent: "danger", className: "save-error" },
      save.error
    );
  }

  let primary = h(
    Button,
    {
      intent: "primary",
      loading: save.running,
      onClick: () => save.run(false),
    },
    "Save"
  );
  if (save.problems != null) {
    primary = h(
      Button,
      {
        intent: "warning",
        loading: save.running,
        onClick: () => save.run(true),
      },
      "Save anyway"
    );
  }

  return h(
    Dialog,
    { isOpen, onClose, title: "Review changes", icon: "floppy-disk" },
    [
      h(DialogBody, [h(ChangeList, { changes }), problems, error]),
      h(DialogFooter, {
        actions: [
          h(Button, { key: "cancel", onClick: onClose }, "Cancel"),
          primary,
        ],
      }),
    ]
  );
}

/** Save the draft, then reload the graph so the tree shows the database's
 * state rather than the draft's. */
function useSave(onClose: () => void) {
  const store = useStore();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [problems, setProblems] = useState<SaveProblem[] | null>(null);

  const run = async (force: boolean) => {
    setRunning(true);
    setError(null);
    try {
      await saveDraft(store.get(editAtoms.draft), force);
      const graph = await fetchCompilationGraph();
      store.set(graphAtom, graph);
      store.set(graphVersionAtom, store.get(graphVersionAtom) + 1);
      store.set(editAtoms.discard);
      store.set(editAtoms.needsTopoUpdate, true);
      setProblems(null);
      onClose();
    } catch (err) {
      if (err instanceof SaveRefused) {
        setProblems(err.problems);
      } else {
        setError(String(err));
      }
    } finally {
      setRunning(false);
    }
  };

  return { run, running, error, problems };
}

function ChangeList({ changes }: { changes: Change[] }) {
  return h(
    "ul.change-list",
    changes.map((change, i) => h("li", { key: i }, describeChange(change)))
  );
}

function describeChange(change: Change) {
  if (change.kind === "property") {
    return [
      h("strong", change.node.slug),
      ` ${change.field}: `,
      h("code", String(change.previous ?? "—")),
      " → ",
      h("code", String(change.value)),
    ];
  }
  const { compilation, member } = change;
  if (change.kind === "added") {
    return [
      h(Tag, { minimal: true, intent: "success" }, "add"),
      ` ${member.slug} to `,
      h("strong", compilation.slug),
      priorityText(change.priority),
    ];
  }
  if (change.kind === "removed") {
    return [
      h(Tag, { minimal: true, intent: "danger" }, "remove"),
      ` ${member.slug} from `,
      h("strong", compilation.slug),
    ];
  }
  return [
    h(Tag, { minimal: true }, "priority"),
    ` ${member.slug} in `,
    h("strong", compilation.slug),
    `: ${change.previous ?? "—"} → ${change.priority ?? "—"}`,
  ];
}

function priorityText(priority: number | null) {
  if (priority == null) return "";
  return ` at priority ${priority}`;
}

function ProblemList({ problems }: { problems: SaveProblem[] }) {
  return h(
    Callout,
    { intent: "warning", title: "Refused by the member checks" },
    [
      h(
        "ul.change-list",
        problems.map((p, i) =>
          h("li", { key: i }, `${p.member} in ${p.compilation}: ${p.reason}`)
        )
      ),
      h("p", "Save anyway if the membership is intended."),
    ]
  );
}

/* ------------------------------------------------------------- properties */

/** The selected source's authored properties, in the assistant panel. */
export function FocusEditor() {
  const isAdmin = useIsAdmin();
  const editing = useAtomValue(editAtoms.editing);
  const node = useAtomValue(focusNodeAtom);
  if (!isAdmin || !editing || node == null) return null;
  return h(NodeProperties, { node });
}

function NodeProperties({ node }: { node: GraphNode }) {
  const setProperty = useSetAtom(editAtoms.setProperty);
  const id = node.source_id;

  let modeField = null;
  let addMember = null;
  if (node.is_compilation) {
    addMember = h(AddMember, { node });
    // Read-only: fixed by how the compilation's contents were built, so
    // changing it is restructuring (`macrostrat compilations mode`), not an edit.
    modeField = h("p.assembly-mode", [
      "Assembly mode: ",
      h("code", node.assembly_mode ?? "topological"),
    ]);
  }

  return h(Callout, { className: "node-properties", icon: "edit" }, [
    h("h4.properties-title", `Edit ${node.slug}`),
    h(
      FormGroup,
      { label: "Name" },
      h(InputGroup, {
        value: node.name ?? "",
        onChange: (evt) => setProperty(id, { name: evt.currentTarget.value }),
      })
    ),
    h(Switch, {
      label: "Served (may be requested by name)",
      checked: node.is_served,
      onChange: () => setProperty(id, { is_served: !node.is_served }),
    }),
    modeField,
    addMember,
  ]);
}

/** Add any map in the graph to the selected compilation, at the top. The same
 * as a drop onto its row, for a map the tree is not showing. */
function AddMember({ node }: { node: GraphNode }) {
  const graph = useAtomValue(graphAtom);
  const children = useAtomValue(treeAtoms.children);
  const addMember = useSetAtom(editAtoms.addMember);

  const items = useMemo(() => {
    const current = new Set(
      (children.get(node.source_id) ?? []).map((e) => e.member_id)
    );
    return graph.nodes
      .filter(
        (n) => n.source_id !== node.source_id && !current.has(n.source_id)
      )
      .sort((a, b) => a.slug.localeCompare(b.slug));
  }, [graph, children, node.source_id]);

  return h(
    FormGroup,
    { label: "Add a member" },
    h(Suggest<GraphNode>, {
      items,
      selectedItem: null,
      itemPredicate: matchNode,
      itemRenderer: renderNode,
      inputValueRenderer: () => "",
      onItemSelect: (n) => addMember(node.source_id, n.source_id),
      noResults: h(MenuItem, {
        disabled: true,
        text: "No matching maps",
        roleStructure: "listoption",
      }),
      resetOnClose: true,
      resetOnSelect: true,
      fill: true,
      popoverProps: { minimal: true, matchTargetWidth: true },
      inputProps: {
        placeholder: "Search maps by slug or name…",
        leftIcon: "add",
      },
    })
  );
}

const matchNode: ItemPredicate<GraphNode> = (query, node) => {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return false;
  return (
    node.slug.toLowerCase().includes(q) ||
    (node.name ?? "").toLowerCase().includes(q) ||
    String(node.source_id) === q
  );
};

function renderNode(node: GraphNode, { handleClick, handleFocus, modifiers }) {
  if (!modifiers.matchesPredicate) return null;
  return h(MenuItem, {
    key: node.source_id,
    text: nodeName(node),
    label: node.slug,
    active: modifiers.active,
    onClick: handleClick,
    onFocus: handleFocus,
    roleStructure: "listoption",
  });
}
