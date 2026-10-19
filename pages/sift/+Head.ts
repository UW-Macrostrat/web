import h from "@macrostrat/hyper";

/** Sift's links were fragments (`/sift/#/strat_name/1`): hand the fragment to
 * the server as a path, which redirects it to the lexicon. */
function redirectLegacyHash() {
  const { hash } = window.location;
  let target = "/lex";
  if (hash.startsWith("#/")) target = "/sift" + hash.slice(1);
  window.location.replace(target);
}

export default function Head() {
  return h("script", {
    dangerouslySetInnerHTML: {
      __html: `(${redirectLegacyHash.toString()})()`,
    },
  });
}
