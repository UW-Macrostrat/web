import h from "@macrostrat/hyper";

/** Where each v1 homepage section now lives. `macrostrat check` asserts these
 * pairs are in the served HTML; change the two together. */
const legacyAnchors = {
  about: "/about",
  apps: "/community/apps",
  api: "/docs/data-services",
  people: "/about/people",
  donate: "/about/support",
  publications: "/publications",
};

/** Redirects v1 `/#people`-style links before the client bundle loads. */
function redirectLegacyAnchor(anchors: Record<string, string>) {
  const key = window.location.hash.slice(1);
  if (window.location.pathname !== "/" || !Object.hasOwn(anchors, key)) return;
  window.location.replace(anchors[key]);
}

export default function Head() {
  return h("script", {
    dangerouslySetInnerHTML: {
      __html: `(${redirectLegacyAnchor.toString()})(${JSON.stringify(
        legacyAnchors
      )})`,
    },
  });
}
