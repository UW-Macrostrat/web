/**
 * Source-keyed tag editing for map ingestion.
 *
 * A single, reusable tag-list control that targets the tag API keyed on
 * **`source_id`** (every map has one; we're moving off the legacy
 * `ingest_process_id` key). It's decoupled from any table/store: the caller
 * passes the set of maps it applies to (`{ source_id, tags }`) plus an
 * `onChanged` refresh callback, so the same control drives:
 *   - the ingestion **list** (a selection of maps → bulk add/remove), and
 *   - a **single** map's page.
 *
 * ── API assumption ────────────────────────────────────────────────────────
 * Reads/writes go to a PostgREST resource **keyed on `(source_id, tag)`**,
 * assumed to be a writable tag view in the `maps_metadata` schema exposed on the
 * general PostgREST base (`postgrestPrefix`). The migration that repoints tag
 * storage from `ingest_process_id` → `source_id` is handled server-side; the web
 * side only needs the resource to accept `source_id`. To retarget, change
 * `TAGS_BASE` / `TAGS_TABLE` below.
 *   - available tags:  GET  {base}/{table}?select=tag           (deduped)
 *   - add:             POST {base}/{table}  [{ source_id, tag }] (ignore dupes)
 *   - remove:          DELETE {base}/{table}?tag=eq.T&source_id=in.(…)
 */
import { PostgrestClient } from "@supabase/postgrest-js";
import { Button, PopoverNext } from "@blueprintjs/core";
import { useToaster } from "@macrostrat/ui-components";
import { postgrestPrefix } from "@macrostrat-web/settings";
import { atom, useAtomValue, useSetAtom } from "jotai";
import { atomWithRefresh, loadable } from "jotai/utils";
import { useCallback, useEffect, useMemo, useState } from "react";
import h from "@macrostrat/hyper";
import { TagListControl } from "./controls";

/** The tag resource, keyed on `(source_id, tag)`. See the API assumption note. */
const TAGS_BASE = postgrestPrefix;
const TAGS_TABLE = "map_ingest_tags";

const tagsTable = () => new PostgrestClient(TAGS_BASE).from(TAGS_TABLE);

/** The minimum a map needs to be taggable: its `source_id` and current tags. */
export interface TaggableMap {
  source_id: number;
  tags?: string[];
}

// ---- Tag colors (stable per name; consumer/presentation concern) ----

function tagHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hash;
}

/** A stable color per tag name (Java-style string hash → RGB hex). */
export function tagColor(name: string): string {
  const c = (tagHash(name) & 0x00ffffff).toString(16).toUpperCase();
  return "#" + ("000000" + c).slice(-6);
}

/** Readable text (dark/light) for a tag background, by perceived luminance. */
export function textColorFor(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#182026" : "#ffffff";
}

// ---- API (source_id-keyed) ----

/**
 * The universe of defined tag names, as a jotai atom — one fetch per session,
 * shared by every consumer (the list's search bar, the tag editors), and
 * refreshable so a newly created tag shows up everywhere at once. This replaces
 * a module-level cache plus a `useState`/`useEffect` pair per consumer.
 */
const definedTagsSourceAtom = atomWithRefresh(async (): Promise<string[]> => {
  const { data, error } = await tagsTable().select("tag");
  if (error != null) throw error;
  return [...new Set((data ?? []).map((r: any) => r.tag as string))].sort();
});

/** Non-suspending view of the defined tags. */
export const definedTagsAtom = loadable(definedTagsSourceAtom);

/** Write-only: re-read the defined tags (after a create, say). */
export const refreshDefinedTagsAtom = atom(null, (_get, set) => {
  set(definedTagsSourceAtom);
});

/** The defined tags, with a flag for a failed read (so a caller can degrade). */
export function useDefinedTags(): { tags: string[]; failed: boolean } {
  const state = useAtomValue(definedTagsAtom);
  if (state.state === "hasData") return { tags: state.data, failed: false };
  return { tags: [], failed: state.state === "hasError" };
}

/** Add `tag` to every source in `sourceIds` (existing pairs are left alone). */
export async function addTagToSources(sourceIds: number[], tag: string) {
  const cleaned = tag.trim();
  if (cleaned === "" || sourceIds.length === 0) return;
  const rows = sourceIds.map((source_id) => ({ source_id, tag: cleaned }));
  // (source_id, tag) is the PK, so ignore-duplicates makes add idempotent.
  const { error } = await tagsTable().upsert(rows, { ignoreDuplicates: true });
  if (error != null) throw error;
}

/** Remove `tag` from every source in `sourceIds`. */
export async function removeTagFromSources(sourceIds: number[], tag: string) {
  if (sourceIds.length === 0) return;
  const { error } = await tagsTable()
    .delete()
    .eq("tag", tag)
    .in("source_id", sourceIds);
  if (error != null) throw error;
}

/** Current tags for a single source, fetched by `source_id`. Lets a per-map
 * surface work from just a `source_id` (no need for the parent to supply the
 * live tag array); `refresh` re-reads after an edit. */
export function useSourceTags(
  sourceId: number | undefined,
  initial?: string[]
) {
  const [tags, setTags] = useState<string[]>(initial ?? []);
  const refresh = useCallback(async () => {
    if (sourceId == null) return;
    try {
      const { data } = await tagsTable()
        .select("tag")
        .eq("source_id", sourceId);
      setTags((data ?? []).map((r: any) => r.tag as string).sort());
    } catch {
      /* leave the last-known tags in place on a read failure */
    }
  }, [sourceId]);
  useEffect(() => {
    refresh();
  }, [refresh]);
  return { tags, refresh };
}

// ---- The reusable control ----

export interface MapTagControlProps {
  /** Maps the edit applies to (one, or a whole selection). */
  maps: TaggableMap[];
  /** Called after a successful add/remove so the caller can re-read tags. */
  onChanged?: () => void;
}

/**
 * The tag editor body: **one Blueprint tag list** over the whole target set.
 * The chips are the tags the set carries — removable in place — the dropdown is
 * the rest of the vocabulary, and a tag held by only some of the selection
 * reads as a `minimal` chip labelled with its share. So adding, removing, and
 * *seeing* what the selection is tagged with are the same control, rather than
 * a checkbox list you have to open and read down.
 *
 * Immediate-mode: each click writes and refreshes.
 */
export function MapTagControl({ maps, onChanged }: MapTagControlProps) {
  const toaster = useToaster();
  const { tags: available } = useDefinedTags();
  const refreshDefinedTags = useSetAtom(refreshDefinedTagsAtom);
  const [created, setCreated] = useState<string[]>([]);

  const sourceIds = useMemo(() => maps.map((m) => m.source_id), [maps]);

  // Defined tags ∪ session-created ∪ whatever the selection already carries.
  const allTags = useMemo(
    () =>
      [
        ...new Set([
          ...available,
          ...created,
          ...maps.flatMap((m) => m.tags ?? []),
        ]),
      ].sort(),
    [available, created, maps]
  );

  const usage = useCallback(
    (tag: string) => ({
      count: maps.filter((m) => m.tags?.includes(tag)).length,
      total: maps.length,
    }),
    [maps]
  );

  const apply = useCallback(
    async (tag: string, add: boolean) => {
      try {
        if (add) await addTagToSources(sourceIds, tag);
        else await removeTagFromSources(sourceIds, tag);
        refreshDefinedTags();
        onChanged?.();
      } catch (e: any) {
        toaster?.show?.({
          message: `Tag update failed: ${e?.message ?? e}`,
          intent: "danger",
        });
      }
    },
    [sourceIds, onChanged, toaster, refreshDefinedTags]
  );

  const onCreate = useCallback(
    (tag: string) => {
      if (tag === "") return;
      setCreated((c) => [...new Set([...c, tag])]);
      apply(tag, true);
    },
    [apply]
  );

  return h(TagListControl, {
    tags: allTags,
    usage,
    onToggle: apply,
    onCreate,
    colorForTag: tagColor,
  });
}

export interface MapTagControlButtonProps extends MapTagControlProps {
  /** Button label; defaults to "Tags". */
  label?: string;
  minimal?: boolean;
  small?: boolean;
}

/** A popover-triggering button wrapping `MapTagControl`, for toolbars/headers.
 * The label carries no count — the selection indicator beside it already says
 * how many maps are selected. */
export function MapTagControlButton({
  maps,
  onChanged,
  label = "Tags",
  minimal = true,
  small = true,
}: MapTagControlButtonProps) {
  return h(
    PopoverNext,
    {
      placement: "bottom-start",
      content: h(
        "div",
        { style: { padding: "8px", width: "320px" } },
        h(MapTagControl, { maps, onChanged })
      ),
    },
    h(
      Button,
      {
        minimal,
        small,
        icon: "tag",
        rightIcon: "caret-down",
        disabled: maps.length === 0,
      },
      label
    )
  );
}
