import h from "@macrostrat/hyper";

/** Redirects legacy `/sift/#/…` fragment links before the client bundle loads.
 * `macrostrat check` asserts this script is in the served HTML. */
function redirectLegacyHash() {
  const { pathname, hash } = window.location;
  if (!/^\/sift\/?$/.test(pathname) || !hash.startsWith("#/")) return;
  window.location.replace("/sift" + hash.slice(1));
}

export default function Head() {
  return h("script", {
    dangerouslySetInnerHTML: {
      __html: `(${redirectLegacyHash.toString()})()`,
    },
  });
}
