import h from "@macrostrat/hyper";
import { useAtomValue } from "jotai";
import { layoutShellAtom } from "~/layouts/hybrid";
import { UserPersona } from "~/components/auth";

/**
 * The persona control for the hybrid frame's header. The map and split
 * shells' headers are narrow panels, so there it is just the icon; the
 * content shell has room for the name. Replaces the page's old login/logout
 * toggle: same placement, but it reflects the session (name, degraded role)
 * and opens the standard panel instead of toggling.
 */
export function HybridPersona() {
  const compact = useAtomValue(layoutShellAtom) !== "content";
  return h(UserPersona, { compact, large: !compact });
}
