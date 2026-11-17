/** Every reference, without geometries: a couple of thousand small rows, seeded
 * into the HTML so the first render is the real list. The geometries are
 * fetched by the map. */

import { fetchRefs, type Reference } from "./api";

export async function data() {
  let refs: Reference[] = [];
  try {
    refs = await fetchRefs();
  } catch (error) {
    // A dev page shouldn't 500 because the API is down.
    console.error("Could not load references:", error);
  }
  return { refs };
}
