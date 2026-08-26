/** This is a prototype layout page for multi-panel content applications,
 * which we designed as a general frame for pages that can be list-dominant, map-dominant, or balanced.
 * We hope to integrate this into the app as a demo page and then build pages (e.g., the column list page) atop it.
 *
 */

import React, { useState, useMemo } from "react";
import h from "@macrostrat/hyper";

/* ============================================================
   PageShell
   ============================================================ */
function PageShell({ title, actions, children }) {
  return h(
    "div",
    {
      style: {
        display: "grid",
        gridTemplateRows: "56px 1fr",
        height: "100%",
        minHeight: 560,
        background: "#0f1115",
        color: "#e7e9ee",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        fontSize: 13,
        border: "1px solid #23262e",
        borderRadius: 10,
        overflow: "hidden",
      },
    },
    [
      h(
        "div",
        {
          key: "header",
          style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 16px",
            borderBottom: "1px solid #23262e",
            background: "#14161c",
            flexWrap: "wrap",
            gap: 6,
          },
        },
        [
          h(
            "div",
            { key: "title", style: { fontWeight: 600, fontSize: 14 } },
            title
          ),
          h(
            "div",
            {
              key: "actions",
              style: { display: "flex", gap: 6, alignItems: "center" },
            },
            actions
          ),
        ]
      ),
      h("div", { key: "body", style: { minHeight: 0, minWidth: 0 } }, children),
    ]
  );
}

/* ============================================================
   Shared data
   ============================================================ */
function useItemsData() {
  const items = useMemo(
    () => [
      { id: "1", name: "Riverside Depot", status: "active", x: 22, y: 38 },
      { id: "2", name: "Harborview Site", status: "active", x: 68, y: 20 },
      { id: "3", name: "North Ridge Facility", status: "paused", x: 44, y: 62 },
      { id: "4", name: "Elm Street Hub", status: "active", x: 80, y: 55 },
      { id: "5", name: "Lakeside Annex", status: "flagged", x: 30, y: 75 },
    ],
    []
  );
  const [selectedId, setSelectedId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  return { items, selectedId, setSelectedId, hoveredId, setHoveredId };
}

const statusColor = {
  active: "#4ade80",
  paused: "#9ca3af",
  flagged: "#f59e0b",
};

/* ============================================================
   ListView
   ============================================================ */
function ListView({ items, selectedId, hoveredId, onSelect, onHover }) {
  return h(
    "div",
    { style: { padding: 8, overflow: "auto", height: "100%" } },
    items.map((it) =>
      h(
        "div",
        {
          key: it.id,
          onClick: () => onSelect(it.id),
          onMouseEnter: () => onHover(it.id),
          onMouseLeave: () => onHover(null),
          style: {
            padding: "8px 10px",
            borderRadius: 6,
            marginBottom: 4,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            background:
              selectedId === it.id
                ? "#2a2f3a"
                : hoveredId === it.id
                ? "#1c1f27"
                : "transparent",
            border:
              selectedId === it.id
                ? "1px solid #4b5563"
                : "1px solid transparent",
          },
        },
        [
          h("span", {
            key: "dot",
            style: {
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: statusColor[it.status],
              flexShrink: 0,
            },
          }),
          h("span", { key: "name", style: { flex: 1 } }, it.name),
          h(
            "span",
            { key: "status", style: { color: "#6b7280", fontSize: 11 } },
            it.status
          ),
        ]
      )
    )
  );
}

/* ============================================================
   MapView
   ============================================================ */
function MapView({ items, selectedId, hoveredId, onSelect, onHover }) {
  return h(
    "div",
    {
      style: {
        position: "relative",
        width: "100%",
        height: "100%",
        background:
          "repeating-linear-gradient(0deg, #14161c, #14161c 19px, #1a1d24 20px), repeating-linear-gradient(90deg, #14161c, #14161c 19px, #1a1d24 20px)",
      },
    },
    items.map((it) => {
      const active = selectedId === it.id || hoveredId === it.id;
      return h("div", {
        key: it.id,
        onClick: () => onSelect(it.id),
        onMouseEnter: () => onHover(it.id),
        onMouseLeave: () => onHover(null),
        title: it.name,
        style: {
          position: "absolute",
          left: `${it.x}%`,
          top: `${it.y}%`,
          width: active ? 14 : 10,
          height: active ? 14 : 10,
          borderRadius: "50%",
          background: statusColor[it.status],
          border: active ? "2px solid #fff" : "2px solid #0f1115",
          transform: "translate(-50%, -50%)",
          cursor: "pointer",
          transition: "all 0.12s ease",
          boxShadow: active ? "0 0 0 4px rgba(255,255,255,0.08)" : "none",
        },
      });
    })
  );
}

/* ============================================================
   AssistantSidebar — the single, reused, "contextual content"
   component. Rendered as a column, embedded under the map, or
   floating — same component, three placements.
   ============================================================ */
function AssistantSidebar({ items, selectedId }) {
  const selected = items.find((i) => i.id === selectedId);
  return h(
    "div",
    { style: { padding: 14, overflow: "auto", height: "100%" } },
    [
      h(
        "div",
        {
          key: "title",
          style: { fontWeight: 600, marginBottom: 8, color: "#c7cad1" },
        },
        "Assistant"
      ),
      selected
        ? h(
            "div",
            { key: "body", style: { color: "#8b8f99", lineHeight: 1.5 } },
            [
              h(
                "strong",
                { key: "name", style: { color: "#e7e9ee" } },
                selected.name
              ),
              ` is currently `,
              h("em", { key: "status" }, selected.status),
              `. Want a summary of recent activity here?`,
            ]
          )
        : h(
            "div",
            { key: "body", style: { color: "#8b8f99", lineHeight: 1.5 } },
            "1 site flagged this week — Lakeside Annex. Select a site to see more, or ask me anything about this list."
          ),
    ]
  );
}

/* ============================================================
   MapColumn — map is always aspect-locked. If the assistant is
   embedded here, it fills the leftover space beneath the map.
   ============================================================ */
function MapColumn({ viewProps, embedAssistant }) {
  return h(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
      },
    },
    [
      h(
        "div",
        {
          key: "map",
          style: {
            width: "100%",
            aspectRatio: "4 / 3",
            maxHeight: "65%",
            flexShrink: 0,
          },
        },
        h(MapView, viewProps)
      ),
      embedAssistant &&
        h(
          "div",
          {
            key: "embedded-assistant",
            style: { flex: 1, minHeight: 0, borderTop: "1px solid #23262e" },
          },
          h(AssistantSidebar, {
            items: viewProps.items,
            selectedId: viewProps.selectedId,
          })
        ),
    ]
  );
}

/* ============================================================
   Composer
   ============================================================ */
const LAYOUT_FR = {
  "list-only": ["1fr", "0fr"],
  "map-only": ["0fr", "1fr"],
  "list-primary": ["3fr", "2fr"],
  "map-primary": ["2fr", "3fr"],
};

const LAYOUT_MODES = [
  { id: "list-only", label: "List only" },
  { id: "list-primary", label: "List-primary" },
  { id: "map-primary", label: "Map-primary" },
  { id: "map-only", label: "Map only" },
];

const ASSISTANT_WIDTH = "clamp(260px, 26vw, 360px)";

// Derivation rule, three placements from one function:
//   list-only     → own column
//   list-primary  → embedded (fills the map's leftover space)
//   map-primary /
//   map-only      → floating (modal-ish overlay, height-capped)
function assistantPlacement(layoutMode) {
  if (layoutMode === "list-only") return "column";
  if (layoutMode === "list-primary") return "embed";
  return "float";
}

// Floating panel sizing: never taller than its own content, and
// never more than `maxHeightPct` of the container — whichever is
// smaller. Configurable per call site (e.g. denser vs. roomier
// pages might want a different cap).
function FloatingAssistant({
  items,
  selectedId,
  visible,
  maxHeightPct = 0.5,
  topOffset = 12,
}) {
  return h(
    "div",
    {
      style: {
        position: "absolute",
        top: topOffset,
        right: 12,
        width: ASSISTANT_WIDTH,
        maxHeight: `${maxHeightPct * 100}%`,
        height: "auto",
        background: "rgba(20, 22, 28, 0.94)",
        backdropFilter: "blur(6px)",
        border: "1px solid #2a2d36",
        borderRadius: 10,
        boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
        overflow: "auto",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : "translateX(12px)",
        pointerEvents: visible ? "auto" : "none",
        transition: "opacity 180ms ease, transform 180ms ease, top 180ms ease",
      },
    },
    h(AssistantSidebar, { items, selectedId })
  );
}

function Composer({
  layoutMode,
  showAssistant,
  viewProps,
  assistantMaxHeightPct,
  assistantTopOffset,
}) {
  const [listFr, mapFr] = LAYOUT_FR[layoutMode];
  const placement = assistantPlacement(layoutMode);
  const showColumn = showAssistant && placement === "column";
  const showEmbedded = showAssistant && placement === "embed";
  const showFloating = showAssistant && placement === "float";

  const columns = showColumn
    ? `${listFr} ${mapFr} ${ASSISTANT_WIDTH}`
    : `${listFr} ${mapFr}`;

  return h("div", { style: { position: "relative", height: "100%" } }, [
    h(
      "div",
      {
        key: "grid",
        style: {
          display: "grid",
          gridTemplateColumns: columns,
          height: "100%",
          transition: "grid-template-columns 220ms ease",
        },
      },
      [
        h(
          "div",
          {
            key: "list-col",
            style: { overflow: "hidden", borderRight: "1px solid #23262e" },
          },
          h(ListView, viewProps)
        ),
        h(
          "div",
          { key: "map-col", style: { overflow: "hidden" } },
          h(MapColumn, { viewProps, embedAssistant: showEmbedded })
        ),
        showColumn &&
          h(
            "div",
            {
              key: "assistant-col",
              style: { overflow: "hidden", borderLeft: "1px solid #23262e" },
            },
            h(AssistantSidebar, {
              items: viewProps.items,
              selectedId: viewProps.selectedId,
            })
          ),
      ]
    ),
    h(FloatingAssistant, {
      key: "floating",
      items: viewProps.items,
      selectedId: viewProps.selectedId,
      visible: showFloating,
      maxHeightPct: assistantMaxHeightPct,
      topOffset: assistantTopOffset,
    }),
  ]);
}

/* ============================================================
   Pill
   ============================================================ */
function Pill({ active, onClick, children }) {
  return h(
    "button",
    {
      onClick,
      style: {
        padding: "5px 10px",
        borderRadius: 999,
        border: active ? "1px solid #6b7280" : "1px solid #2a2d36",
        background: active ? "#2a2f3a" : "transparent",
        color: active ? "#fff" : "#9096a1",
        fontSize: 12,
        cursor: "pointer",
      },
    },
    children
  );
}

/* ============================================================
   CHROME LAYER — header/footer, one level up from the content
   composer. Same principle as assistant placement, generalized:
   map-dominant modes (map-primary, map-only) want max bleed, so
   chrome stops reserving layout space and floats instead. It's
   the SAME derivation, just applied to a different content type.
   ============================================================ */
function chromeMode(layoutMode) {
  return layoutMode === "map-primary" || layoutMode === "map-only"
    ? "overlay"
    : "reserved";
}

const HEADER_HEIGHT = 48;

// Left: home/brand + page name. Right: user/config. Two placements:
//   reserved → normal opaque bar, takes its own grid row
//   overlay  → translucent/blurred bar, position:absolute over content
function AppHeader({ mode }) {
  const overlay = mode === "overlay";
  return h(
    "div",
    {
      style: {
        height: HEADER_HEIGHT,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 16px",
        color: "#e7e9ee",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        fontSize: 13,
        ...(overlay
          ? {
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              zIndex: 5,
              background: "rgba(15, 17, 21, 0.72)",
              backdropFilter: "blur(8px)",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }
          : {
              background: "#0f1115",
              borderBottom: "1px solid #23262e",
            }),
      },
    },
    [
      h(
        "div",
        {
          key: "left",
          style: {
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontWeight: 600,
          },
        },
        [
          h("span", { key: "home", style: { opacity: 0.6 } }, "⌂"),
          h("span", { key: "name" }, "Fieldwork"),
        ]
      ),
      h(
        "div",
        {
          key: "right",
          style: { display: "flex", alignItems: "center", gap: 10 },
        },
        [
          h(
            "span",
            { key: "gear", style: { opacity: 0.6, cursor: "pointer" } },
            "⚙"
          ),
          h("div", {
            key: "avatar",
            style: {
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: "#3b3f4a",
            },
          }),
        ]
      ),
    ]
  );
}

const FOOTER_LINKS = ["Docs", "Support", "Status", "Changelog"];
const FOOTER_HEIGHT = 40;

// Two placements:
//   reserved  → normal bar, full nav visible, own grid row
//   collapsed → small floating trigger; tap opens a bottom sheet
//               with the same nav, rather than omitting it
function AppFooter({ mode, sheetOpen, onToggleSheet }) {
  if (mode === "reserved") {
    return h(
      "div",
      {
        style: {
          height: FOOTER_HEIGHT,
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "0 16px",
          background: "#0f1115",
          borderTop: "1px solid #23262e",
          color: "#8b8f99",
          fontSize: 12,
        },
      },
      FOOTER_LINKS.map((label) =>
        h("span", { key: label, style: { cursor: "pointer" } }, label)
      )
    );
  }

  // collapsed
  return [
    h(
      "button",
      {
        key: "trigger",
        onClick: onToggleSheet,
        style: {
          position: "absolute",
          left: "50%",
          bottom: 12,
          transform: "translateX(-50%)",
          zIndex: 6,
          padding: "6px 14px",
          borderRadius: 999,
          border: "1px solid #2a2d36",
          background: "rgba(20, 22, 28, 0.94)",
          backdropFilter: "blur(6px)",
          color: "#c7cad1",
          fontSize: 12,
          cursor: "pointer",
          boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
        },
      },
      sheetOpen ? "Close ▾" : "More ▾"
    ),
    h(
      "div",
      {
        key: "sheet",
        onClick: onToggleSheet,
        style: {
          position: "absolute",
          inset: 0,
          zIndex: 5,
          background: "rgba(0,0,0,0.35)",
          opacity: sheetOpen ? 1 : 0,
          pointerEvents: sheetOpen ? "auto" : "none",
          transition: "opacity 180ms ease",
        },
      },
      h(
        "div",
        {
          onClick: (e) => e.stopPropagation(),
          style: {
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            padding: "14px 16px",
            background: "#14161c",
            borderTop: "1px solid #2a2d36",
            borderRadius: "12px 12px 0 0",
            display: "flex",
            flexDirection: "column",
            gap: 10,
            transform: sheetOpen ? "translateY(0)" : "translateY(100%)",
            transition: "transform 220ms ease",
          },
        },
        FOOTER_LINKS.map((label) =>
          h(
            "span",
            {
              key: label,
              style: { color: "#c7cad1", fontSize: 13, cursor: "pointer" },
            },
            label
          )
        )
      )
    ),
  ];
}

/* ============================================================
   AppFrame — wraps the whole page. Reserves rows for header/
   footer when layoutMode is list-dominant; switches both to
   floating/collapsed chrome when map-dominant, handing that
   space back to the map. Same "reserved vs overlay" grid
   collapsing trick used inside Composer, one level up.
   ============================================================ */
function AppFrame({ layoutMode, children }) {
  const chrome = chromeMode(layoutMode);
  const reserved = chrome === "reserved";
  const [footerSheetOpen, setFooterSheetOpen] = useState(false);

  return h(
    "div",
    {
      style: {
        display: "grid",
        gridTemplateRows: `${reserved ? HEADER_HEIGHT : 0}px 1fr ${
          reserved ? FOOTER_HEIGHT : 0
        }px`,
        height: "100%",
        transition: "grid-template-rows 220ms ease",
        overflow: "hidden",
      },
    },
    [
      reserved &&
        h(
          "div",
          { key: "header-row", style: { overflow: "hidden" } },
          h(AppHeader, { mode: "reserved" })
        ),
      h(
        "div",
        {
          key: "content-row",
          style: { position: "relative", minHeight: 0, overflow: "hidden" },
        },
        [
          !reserved && h(AppHeader, { key: "header-overlay", mode: "overlay" }),
          h(
            "div",
            {
              key: "content",
              style: {
                position: "absolute",
                inset: 0,
                top: !reserved ? HEADER_HEIGHT : 0,
              },
            },
            children
          ),
          !reserved &&
            h(AppFooter, {
              key: "footer-collapsed",
              mode: "collapsed",
              sheetOpen: footerSheetOpen,
              onToggleSheet: () => setFooterSheetOpen((o) => !o),
            }),
        ]
      ),
      reserved &&
        h(
          "div",
          { key: "footer-row", style: { overflow: "hidden" } },
          h(AppFooter, { mode: "reserved" })
        ),
    ]
  );
}

/* ============================================================
   Root demo
   ============================================================ */
export default function LayoutKitDemoV7() {
  const { items, selectedId, setSelectedId, hoveredId, setHoveredId } =
    useItemsData();
  const [layoutMode, setLayoutMode] = useState("list-primary");
  const [showAssistant, setShowAssistant] = useState(true);
  const [assistantMaxHeightPct, setAssistantMaxHeightPct] = useState(0.5);

  const viewProps = {
    items,
    selectedId,
    hoveredId,
    onSelect: setSelectedId,
    onHover: setHoveredId,
  };

  const chrome = chromeMode(layoutMode);
  // When the header overlays content, the floating assistant needs
  // to start below it instead of colliding at top-right.
  const assistantTopOffset = chrome === "overlay" ? HEADER_HEIGHT + 12 : 12;

  return h(
    "div",
    { style: { padding: 16, background: "#000", height: 640 } },
    h(
      "div",
      {
        style: {
          height: "100%",
          background: "#0f1115",
          border: "1px solid #23262e",
          borderRadius: 10,
          overflow: "hidden",
        },
      },
      h(
        AppFrame,
        { layoutMode },
        h(
          PageShell,
          {
            title: "Sites",
            actions: [
              h(
                "div",
                { key: "modes", style: { display: "flex", gap: 6 } },
                LAYOUT_MODES.map((m) =>
                  h(
                    Pill,
                    {
                      key: m.id,
                      active: layoutMode === m.id,
                      onClick: () => setLayoutMode(m.id),
                    },
                    m.label
                  )
                )
              ),
              h("div", {
                key: "divider",
                style: { width: 1, background: "#2a2d36", margin: "0 4px" },
              }),
              h(
                Pill,
                {
                  key: "toggle",
                  active: showAssistant,
                  onClick: () => setShowAssistant((s) => !s),
                },
                showAssistant ? "Hide assistant" : "Show assistant"
              ),
              h(
                "div",
                {
                  key: "cap",
                  style: {
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    color: "#6b7280",
                    fontSize: 11,
                  },
                },
                [
                  "Modal cap",
                  h("input", {
                    key: "range",
                    type: "range",
                    min: 0.2,
                    max: 1,
                    step: 0.1,
                    value: assistantMaxHeightPct,
                    onChange: (e) =>
                      setAssistantMaxHeightPct(parseFloat(e.target.value)),
                    style: { width: 70 },
                  }),
                  `${Math.round(assistantMaxHeightPct * 100)}%`,
                ]
              ),
            ],
          },
          h(Composer, {
            layoutMode,
            showAssistant,
            viewProps,
            assistantMaxHeightPct,
            assistantTopOffset,
          })
        )
      )
    )
  );
}
