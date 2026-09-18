/** Cache management — flush the Varnish tile cache wholesale.
 *
 * Tiles are cached in two layers: Varnish (L1) in front of the tileserver, and
 * the `tile_cache.tile` table (L2) the tileserver renders into. This page drops
 * L1, which is the fix for "the cache is serving something stale" — tiles come
 * back from L2 without being re-rendered. Expiring L2 as well, for a region or a
 * set of source maps, is what /dev/map/cache does.
 *
 * Everything here goes through api_v3's admin-gated `/cache/*` routes; the
 * tileserver's own cache routes are not reachable from outside the network.
 */

import hyper from "@macrostrat/hyper";
import { Alert, Button, Callout, Intent } from "@blueprintjs/core";
import { apiV3Prefix } from "@macrostrat-web/settings";
import { useCallback, useState } from "react";
import { DocumentationPage } from "~/layouts";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

interface FlushResult {
  banned: string;
  flushed: boolean;
}

export function Page() {
  // The page title comes from +config.ts `pageInfo`, via PageBreadcrumbs.
  return h(DocumentationPage, [
    h("div.cache-page", [
      h("p.layer-description", [
        "Macrostrat's tiles are cached in two layers: ",
        h("strong", "Varnish"),
        " sits in front of the tileserver, and the tileserver renders into a ",
        h("strong", "database tile cache"),
        " behind it. Flushing Varnish is the quick fix when the cache is " +
          "serving something stale — tiles come straight back from the " +
          "database cache without being re-rendered.",
      ]),
      h("p", [
        "To expire the database cache too, for a region or a set of maps, use ",
        h("a", { href: "/dev/map/cache" }, "map cache management"),
        ".",
      ]),
      h(FlushPanel),
    ]),
  ]);
}

function FlushPanel() {
  const { flush, running, result, error } = useCacheFlush();
  const [confirming, setConfirming] = useState(false);

  const onConfirm = useCallback(() => {
    setConfirming(false);
    flush();
  }, [flush]);

  return h("div", [
    h("div.flush-controls", [
      h(
        Button,
        {
          large: true,
          intent: Intent.DANGER,
          icon: "trash",
          loading: running,
          onClick: () => setConfirming(true),
        },
        "Flush the entire tile cache"
      ),
    ]),
    h(FlushOutcome, { result, error }),
    h(
      Alert,
      {
        isOpen: confirming,
        intent: Intent.DANGER,
        icon: "warning-sign",
        confirmButtonText: "Flush everything",
        cancelButtonText: "Cancel",
        onConfirm,
        onCancel: () => setConfirming(false),
      },
      h("p", [
        "This drops every cached tile from Varnish. Nothing is lost — tiles " +
          "are re-served from the database cache — but the tileserver will " +
          "carry the full request load until the cache refills.",
      ])
    ),
  ]);
}

/** The result or error of the last flush, or nothing before one has run. */
function FlushOutcome({
  result,
  error,
}: {
  result: FlushResult | null;
  error: string | null;
}) {
  if (error != null) {
    return h(
      Callout,
      {
        className: "flush-result",
        intent: Intent.DANGER,
        title: "Flush failed",
      },
      error
    );
  }
  if (result == null) return null;
  return h(
    Callout,
    {
      className: "flush-result",
      intent: Intent.SUCCESS,
      title: "Cache flushed",
    },
    [
      h("p", "Every cached tile older than this moment has been invalidated."),
      h("p.ban-expression", result.banned),
    ]
  );
}

/** POST the flush, tracking its in-flight, result and error states. */
function useCacheFlush() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<FlushResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const flush = useCallback(async () => {
    setResult(null);
    setError(null);
    setRunning(true);
    try {
      const resp = await fetch(`${apiV3Prefix}/cache/flush`, {
        method: "POST",
        // The admin check is on the session cookie, which a cross-origin
        // request drops unless it is asked for explicitly.
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!resp.ok) throw new Error(`${resp.status}: ${await resp.text()}`);
      setResult(await resp.json());
    } catch (e) {
      setError(String(e));
    } finally {
      setRunning(false);
    }
  }, []);

  return { flush, running, result, error };
}
