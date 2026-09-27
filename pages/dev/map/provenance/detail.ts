/** The selected map's provenance: what replaces it, what it overlaps, where it
 * is placed, and who is credited for it.
 *
 * Supersession is advisory — it marks the map and deletes nothing — so taking a
 * superseded map out of its compilations is a separate choice, made per
 * compilation, and saved in the same batch (api-v3 `PATCH /compilations`, admin
 * only). References are read-only until per-source references exist in the
 * database (see the Map referencing design).
 */

import {
  AnchorButton,
  Button,
  Callout,
  Checkbox,
  MenuItem,
  Spinner,
  Tag,
} from "@blueprintjs/core";
import { Suggest, type ItemPredicate } from "@blueprintjs/select";
import { apiV3Prefix } from "@macrostrat-web/settings";
import hyper from "@macrostrat/hyper";
import { ErrorCallout } from "@macrostrat/ui-components";
import { useAtom, useAtomValue, useSetAtom, useStore } from "jotai";
import { useMemo, useState } from "react";

import { Link } from "~/components";
import {
  fetchCompilationGraph,
  mapPageHref,
  nodeName,
  type GraphNode,
} from "~/components/compilation-tree";
import { useIsAdmin } from "~/_utils/is-admin";

import {
  compareSlugAtom,
  detailAtom,
  draftAtom,
  effectiveSupersederAtom,
  graphAtom,
  hasChangesAtom,
  needsTopoUpdateAtom,
  neighborsAtom,
  nodesByIdAtom,
  selectedNodeAtom,
  selectedSlugAtom,
  versionAtom,
  type Neighbor,
  type SourceDetail,
} from "./state";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

export function ProvenancePanel() {
  const node = useAtomValue(selectedNodeAtom);
  const detail = useAtomValue(detailAtom);

  if (node == null) {
    return h("div.provenance-panel", [
      h(TopoUpdateBanner),
      h(
        Callout,
        { icon: "list-detail-view" },
        "Pick a map from the list to see its supersession, the maps it overlaps, and who is credited for it."
      ),
    ]);
  }
  if (detail.state === "loading") return h(Spinner);
  if (detail.state === "hasError") {
    return h(ErrorCallout, { error: detail.error as Error });
  }
  const data = detail.data;
  if (data == null) return null;

  return h("div.provenance-panel", [
    h(TopoUpdateBanner),
    h(Header, { node }),
    h(Supersession, { node, detail: data }),
    h(OverlappingMaps),
    h(Memberships, { detail: data }),
    h(SaveBar, { node }),
    h(References, { detail: data }),
  ]);
}

function Header({ node }: { node: GraphNode }) {
  return h("div.detail-header", [
    h("h3.detail-title", nodeName(node)),
    h("div.detail-links", [
      h("code", node.slug),
      h(Link, { href: mapPageHref(node) }, "Map page"),
      h(
        Link,
        { href: `/dev/map/compilations?focus=${node.slug}` },
        "In compilations"
      ),
    ]),
  ]);
}

/* ----------------------------------------------------------- supersession */

function Supersession({
  node,
  detail,
}: {
  node: GraphNode;
  detail: SourceDetail;
}) {
  const isAdmin = useIsAdmin();
  const byId = useAtomValue(nodesByIdAtom);
  const superseder = useAtomValue(effectiveSupersederAtom);
  const draft = useAtomValue(draftAtom);
  const setSelected = useSetAtom(selectedSlugAtom);

  let pending = null;
  if (
    draft?.superseded_by !== undefined &&
    draft.superseded_by !== node.superseded_by
  ) {
    pending = h(Tag, { minimal: true, intent: "warning" }, "unsaved");
  }

  let status = h("p.status", ["Not superseded ", pending]);
  if (superseder != null) {
    const target = byId.get(superseder);
    status = h("p.status", [
      "Superseded by ",
      h(
        "button.link-button",
        { onClick: () => setSelected(target?.slug ?? null) },
        target?.slug ?? `#${superseder}`
      ),
      " ",
      pending,
    ]);
  }

  let editor = null;
  if (isAdmin) editor = h(SupersederPicker, { node });

  let supersedes = null;
  if (detail.supersedes.length > 0) {
    supersedes = h("div.supersedes", [
      h("h5", "Supersedes"),
      h(
        "ul.plain-list",
        detail.supersedes.map((s) =>
          h(
            "li",
            { key: s.source_id },
            h(
              "button.link-button",
              { onClick: () => setSelected(s.slug) },
              s.slug
            )
          )
        )
      ),
    ]);
  }

  return h("section.detail-section", [
    h("h4", "Supersession"),
    status,
    editor,
    supersedes,
  ]);
}

function SupersederPicker({ node }: { node: GraphNode }) {
  const graph = useAtomValue(graphAtom);
  const superseder = useAtomValue(effectiveSupersederAtom);
  const setSuperseder = useSetSuperseder();

  const items = useMemo(
    () =>
      graph.nodes
        .filter((n) => n.source_id !== node.source_id)
        .sort((a, b) => a.slug.localeCompare(b.slug)),
    [graph, node.source_id]
  );

  let clear = null;
  if (superseder != null) {
    clear = h(
      Button,
      { small: true, icon: "cross", onClick: () => setSuperseder(null) },
      "Clear"
    );
  }

  return h("div.picker-row", [
    h(Suggest<GraphNode>, {
      items,
      selectedItem: null,
      itemPredicate: matchNode,
      itemRenderer: renderNode,
      inputValueRenderer: () => "",
      onItemSelect: (n) => setSuperseder(n.source_id),
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
        placeholder: "Set superseder by slug or name…",
        leftIcon: "swap-horizontal",
      },
    }),
    clear,
  ]);
}

function useSetSuperseder() {
  const node = useAtomValue(selectedNodeAtom);
  const [draft, setDraft] = useAtom(draftAtom);
  return (superseded_by: number | null) => {
    if (node == null) return;
    // Taking the map out of compilations follows from superseding it, so the
    // choices go when the superseder does.
    let withdraw = draft?.withdraw ?? [];
    if (superseded_by == null) withdraw = [];
    setDraft({ source_id: node.source_id, withdraw, superseded_by });
  };
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

/* -------------------------------------------------------- overlapping maps */

/** Other maps covering the same ground at this scale or finer, for comparison.
 * Overlap is common and supersession rare, so this is context, not a list of
 * replacements. Hovering one draws it on the map beside the selection. */
function OverlappingMaps() {
  const neighbors = useAtomValue(neighborsAtom);

  let body = null;
  if (neighbors.state === "loading") {
    body = h(Spinner, { size: 16 });
  } else if (neighbors.state === "hasError") {
    body = h(ErrorCallout, { error: neighbors.error as Error });
  } else if (neighbors.data.length === 0) {
    body = h(
      "p.muted",
      "No other map covers this one's ground at its scale or finer."
    );
  } else {
    body = h(
      "ul.overlap-list",
      neighbors.data.map((n) =>
        h(OverlapRow, { key: n.source_id, neighbor: n })
      )
    );
  }

  return h("section.detail-section", [h("h4", "Overlapping maps"), body]);
}

function OverlapRow({ neighbor }: { neighbor: Neighbor }) {
  const setCompare = useSetAtom(compareSlugAtom);
  const setSelected = useSetAtom(selectedSlugAtom);
  const superseder = useAtomValue(effectiveSupersederAtom);

  const parts: string[] = [neighbor.slug];
  if (neighbor.scale != null) parts.push(neighbor.scale);
  if (neighbor.overlap_fraction != null) {
    parts.push(`covers ${Math.round(neighbor.overlap_fraction * 100)}%`);
  }
  if (neighbor.in_compilations.length > 0) {
    parts.push(`in ${neighbor.in_compilations.join(", ")}`);
  }

  let current = null;
  if (superseder === neighbor.source_id) {
    current = h(Tag, { minimal: true, intent: "warning" }, "superseder");
  }

  return h(
    "li.overlap-row",
    {
      onMouseEnter: () => setCompare(neighbor.slug),
      onMouseLeave: () => setCompare(null),
    },
    [
      h("div.overlap-name", [
        h(
          "button.link-button",
          { onClick: () => setSelected(neighbor.slug) },
          neighbor.name ?? neighbor.slug
        ),
        " ",
        current,
      ]),
      h("div.overlap-meta", parts.join(" · ")),
    ]
  );
}

/* ------------------------------------------------------------ memberships */

/** Where the map is placed. A superseded map still resolves wherever it is a
 * member, so an admin can take it out of each compilation as part of the save. */
function Memberships({ detail }: { detail: SourceDetail }) {
  const isAdmin = useIsAdmin();
  const superseder = useAtomValue(effectiveSupersederAtom);
  const [draft, setDraft] = useAtom(draftAtom);
  const setSelected = useSetAtom(selectedSlugAtom);

  if (detail.parents.length === 0) {
    return h("section.detail-section", [
      h("h4", "Memberships"),
      h("p.muted", "In no compilation."),
    ]);
  }

  const withdraw = new Set(draft?.withdraw ?? []);
  const canWithdraw = isAdmin && superseder != null;

  const toggle = (id: number) => {
    const next = new Set(withdraw);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setDraft({
      source_id: detail.source_id,
      superseded_by: draft?.superseded_by,
      withdraw: [...next],
    });
  };

  let hint = null;
  if (canWithdraw) {
    hint = h(
      "p.muted",
      "Superseding a map removes nothing. Tick the compilations to take it out of."
    );
  }

  return h("section.detail-section", [
    h("h4", "Memberships"),
    hint,
    h(
      "ul.plain-list",
      detail.parents.map((p) => {
        const name = h(
          "button.link-button",
          { onClick: () => setSelected(p.slug) },
          p.slug
        );
        if (!canWithdraw) return h("li", { key: p.source_id }, name);
        return h(
          "li",
          { key: p.source_id },
          h(Checkbox, {
            checked: withdraw.has(p.source_id),
            onChange: () => toggle(p.source_id),
            labelElement: h("span", ["Remove from ", name]),
          })
        );
      })
    ),
  ]);
}

/* ------------------------------------------------------------------- save */

function SaveBar({ node }: { node: GraphNode }) {
  const isAdmin = useIsAdmin();
  const hasChanges = useAtomValue(hasChangesAtom);
  const setDraft = useSetAtom(draftAtom);
  const save = useSave();

  if (!isAdmin || !hasChanges) return null;

  let error = null;
  if (save.error != null) {
    error = h(
      Callout,
      { intent: "danger", className: "save-error" },
      save.error
    );
  }

  return h(
    Callout,
    { intent: "primary", className: "save-bar", icon: "floppy-disk" },
    [
      h(ChangeSummary, { node }),
      h("div.save-actions", [
        h(
          Button,
          { intent: "primary", loading: save.running, onClick: save.run },
          "Save"
        ),
        h(Button, { minimal: true, onClick: () => setDraft(null) }, "Discard"),
      ]),
      error,
    ]
  );
}

function ChangeSummary({ node }: { node: GraphNode }) {
  const draft = useAtomValue(draftAtom);
  const byId = useAtomValue(nodesByIdAtom);
  if (draft == null) return null;

  const items = [];
  if (
    draft.superseded_by !== undefined &&
    draft.superseded_by !== node.superseded_by
  ) {
    let text = `${node.slug}: no longer superseded`;
    if (draft.superseded_by != null) {
      const slug =
        byId.get(draft.superseded_by)?.slug ?? `#${draft.superseded_by}`;
      text = `${node.slug}: superseded by ${slug}`;
    }
    items.push(h("li", { key: "superseded" }, text));
  }
  for (const id of draft.withdraw) {
    const slug = byId.get(id)?.slug ?? `#${id}`;
    items.push(h("li", { key: id }, `remove ${node.slug} from ${slug}`));
  }
  return h("ul.change-list", items);
}

/** One batch: the supersession, and each compilation's member list without the
 * map. Member lists come from the whole graph, since the API replaces them. */
function useSave() {
  const store = useStore();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    const draft = store.get(draftAtom);
    const node = store.get(selectedNodeAtom);
    if (draft == null || node == null) return;
    const graph = store.get(graphAtom);

    const edits: any[] = [];
    if (
      draft.superseded_by !== undefined &&
      draft.superseded_by !== node.superseded_by
    ) {
      edits.push({
        source_id: node.source_id,
        superseded_by: draft.superseded_by,
      });
    }
    for (const compilationId of draft.withdraw) {
      const members = graph.edges
        .filter((e) => e.compilation_id === compilationId)
        .filter((e) => e.member_id !== node.source_id)
        .map((e) => ({ member_id: e.member_id, priority: e.priority }));
      edits.push({ source_id: compilationId, members });
    }

    setRunning(true);
    setError(null);
    try {
      await patchCompilations(edits);
      store.set(graphAtom, await fetchCompilationGraph());
      store.set(versionAtom, store.get(versionAtom) + 1);
      if (draft.withdraw.length > 0) store.set(needsTopoUpdateAtom, true);
      store.set(draftAtom, null);
    } catch (err) {
      setError(String(err));
    } finally {
      setRunning(false);
    }
  };

  return { run, running, error };
}

async function patchCompilations(edits: any[]) {
  const res = await fetch(`${apiV3Prefix}/compilations`, {
    method: "PATCH",
    // The admin check is on the session cookie, which a cross-origin request
    // drops unless it is asked for explicitly.
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ edits }),
  });
  if (res.ok) return await res.json();
  const body = await res.json().catch(() => null);
  let message = res.statusText;
  if (typeof body?.detail === "string") message = body.detail;
  throw new Error(`${res.status}: ${message}`);
}

function TopoUpdateBanner() {
  const [needed, setNeeded] = useAtom(needsTopoUpdateAtom);
  if (!needed) return null;
  return h(
    Callout,
    { intent: "warning", icon: "refresh", className: "topo-banner" },
    [
      h("p", [
        "Memberships changed. Run ",
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

/* ------------------------------------------------------------- references */

/** Who is credited, as the source rows hold it today: the map's own citation,
 * and the compilations it was gathered into. Read-only. */
function References({ detail }: { detail: SourceDetail }) {
  const parts: string[] = [];
  if (detail.authors) parts.push(detail.authors);
  if (detail.ref_year) parts.push(`(${detail.ref_year})`);

  let citation = h("p.muted", "No citation recorded.");
  if (detail.ref_title != null || parts.length > 0) {
    citation = h("p.citation", [parts.join(" "), " ", detail.ref_title ?? ""]);
  }

  let link = null;
  if (detail.url) {
    link = h(
      AnchorButton,
      {
        small: true,
        minimal: true,
        icon: "link",
        href: detail.url,
        target: "_blank",
      },
      "Source"
    );
  }

  let compiledIn = null;
  if (detail.parents.length > 0) {
    compiledIn = h("p.muted", [
      "Compiled in ",
      detail.parents.map((p) => p.slug).join(", "),
      ".",
    ]);
  }

  return h("section.detail-section", [
    h("h4", "References"),
    citation,
    link,
    compiledIn,
  ]);
}
