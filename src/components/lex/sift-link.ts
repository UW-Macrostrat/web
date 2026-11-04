/** Sift, the legacy lexicon browser, lives on at v1.macrostrat.org; the core
 * environments' `/sift` routes redirect into the new lexicon instead. */
const legacySiftRoot = "https://v1.macrostrat.org/sift/";

/** The item's page in the legacy Sift app (`/sift/#/<type>/<id>`) */
export function legacySiftURL(type: string, id: number | string): string {
  const url = new URL(legacySiftRoot);
  url.hash = `/${type}/${id}`;
  return url.toString();
}
