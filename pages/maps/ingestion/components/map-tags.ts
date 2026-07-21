/**
 * Source-keyed tag editing for map ingestion.
 *
 * A single, reusable multi-select tag control that targets the tag API keyed on
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
import { TagEditor } from "@macrostrat/data-components";
import { postgrestPrefix } from "@macrostrat-web/settings";
import { useCallback, useEffect, useMemo, useState } from "react";
import h from "@macrostrat/hyper";

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

// The universe of defined tag names — deduped, session-cached. Invalidated on
// any write so a newly created tag shows up in later editor sessions.
let _definedTags: string[] | null = null;

export async function fetchDefinedTags(): Promise<string[]> {
  if (_definedTags != null) return _definedTags;
  const { data, error } = await tagsTable().select("tag");
  if (error != null) throw error;
  _definedTags = [
    ...new Set((data ?? []).map((r: any) => r.tag as string)),
  ].sort();
  return _definedTags;
}

export function invalidateDefinedTags() {
  _definedTags = null;
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
export function useSourceTags(sourceId: number | undefined, initial?: string[]) {
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
 * The tag editor body: a searchable list of every defined tag, each showing its
 * tri-state usage across `maps` (all / some / none of the selection have it).
 * Clicking toggles the tag across the whole set; a new tag can be created
 * inline. Immediate-mode — each click writes and refreshes.
 */
export function MapTagControl({ maps, onChanged }: MapTagControlProps) {
  const toaster = useToaster();
  const [available, setAvailable] = useState<string[]>([]);
  const [created, setCreated] = useState<string[]>([]);

  useEffect(() => {
    fetchDefinedTags()
      .then(setAvailable)
      .catch(() => {});
  }, []);

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
    (tag: string) => {
      if (maps.length === 0) return "none" as const;
      const n = maps.filter((m) => m.tags?.includes(tag)).length;
      if (n === 0) return "none" as const;
      if (n === maps.length) return "all" as const;
      return "partial" as const;
    },
    [maps]
  );

  const apply = useCallback(
    async (tag: string, add: boolean) => {
      try {
        if (add) await addTagToSources(sourceIds, tag);
        else await removeTagFromSources(sourceIds, tag);
        invalidateDefinedTags();
        onChanged?.();
      } catch (e: any) {
        toaster?.show?.({
          message: `Tag update failed: ${e?.message ?? e}`,
          intent: "danger",
        });
      }
    },
    [sourceIds, onChanged, toaster]
  );

  const onCreate = useCallback(
    (tag: string) => {
      setCreated((c) => [...new Set([...c, tag])]);
      apply(tag, true);
    },
    [apply]
  );

  return h(TagEditor, {
    tags: allTags,
    usage,
    onChange: apply,
    onCreate,
    colorForTag: tagColor,
  });
}

export interface MapTagControlButtonProps extends MapTagControlProps {
  /** Button label; defaults to "Tags (N)". */
  label?: string;
  minimal?: boolean;
  small?: boolean;
}

/** A popover-triggering button wrapping `MapTagControl`, for toolbars/headers. */
export function MapTagControlButton({
  maps,
  onChanged,
  label,
  minimal = true,
  small = true,
}: MapTagControlButtonProps) {
  return h(
    PopoverNext,
    {
      placement: "bottom-start",
      content: h(
        "div",
        { style: { padding: "6px", width: "260px" } },
        h(MapTagControl, { maps, onChanged })
      ),
    },
    h(
      Button,
      { minimal, small, icon: "tag", rightIcon: "caret-down" },
      label ?? `Tags (${maps.length})`
    )
  );
}
