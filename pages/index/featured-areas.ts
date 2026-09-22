/** Featured areas: the places the homepage hero opens on, and the carousel the
 * reader can move through.
 *
 * An area is a camera, a title and a description, plus two optional things that
 * make it a *story* rather than a viewpoint: a column to pin, and an age range
 * to open filtered to. That is the whole model — adding "the Grand Canyon's
 * Paleozoic section" or "New Zealand" is a literal-object edit to the list
 * below, with nothing else to touch.
 *
 * The list is deliberately **fixed and server-known**: every area the hero can
 * show is in it at build time, which is what would let these views be
 * prerendered and served as images until the reader first touches the map. A
 * synthetic "where you were looking" area, built from localStorage, used to go
 * in front of it; it said nothing the map didn't already show and it made the
 * set unknowable to the server, so it is gone.
 */

/** Where the hero's camera sits. Pitch and bearing are part of the model, not
 * a global constant, so an area can be flat, rotated or oblique as it suits. */
export interface MapCamera {
  lat: number;
  lng: number;
  zoom: number;
  pitch?: number;
  bearing?: number;
}

export interface FeaturedArea {
  /** Stable, and the React key — also the obvious thing to put in the URL when
   * these become linkable. */
  id: string;
  title: string;
  description: string;
  view: MapCamera;
  /** Pin this column rather than taking whatever the map's centre is over. */
  columnID?: number;
  /** Open with the age filter already set: an interval by name, resolved
   * against the international timescale, or explicit bounds in Ma, oldest
   * first. */
  ageRange?: string | [number, number];
}

/** The hero's default camera angle — an oblique, terrain-lit view.
 *
 * **Pitch is what decides 2D vs 3D.** An area with a pitch gets terrain; one
 * with `pitch: 0` is flat and overhead, which is the right way to show a map
 * pattern (a dome, a project's coverage) rather than a landscape. Terrain also
 * needs the camera under ~200 km, which in this frame means a zoom around 10 —
 * a pitched area zoomed further out would be pitched but flat. */
export const HERO_PITCH = 52;
export const HERO_BEARING = -18;

function camera(
  lat: number,
  lng: number,
  zoom: number,
  overrides: Partial<MapCamera> = {}
): MapCamera {
  return { lat, lng, zoom, pitch: HERO_PITCH, bearing: HERO_BEARING, ...overrides };
}

export const featuredAreas: FeaturedArea[] = [
  {
    id: "grand-canyon",
    title: "The Grand Canyon",
    description:
      "A kilometre of Paleozoic strata, layer by layer, over Proterozoic basement — the section that taught North America to read its own rock record.",
    view: camera(36.1, -112.1, 10.2),
    columnID: 491,
    ageRange: "Paleozoic",
  },
  {
    id: "paradox-basin",
    title: "Canyonlands and the Paradox Basin",
    description:
      "Mesozoic sandstones stacked over a salt basin, cut open by the Colorado and the Green.",
    view: camera(38.57, -109.55, 10.4),
    columnID: 495,
    ageRange: "Mesozoic",
  },
  {
    id: "escalante",
    title: "Grand Staircase–Escalante",
    description:
      "The stepped Mesozoic plateaus of southern Utah, where the same formations climb north one cliff at a time.",
    view: camera(37.4, -111.4, 10),
    ageRange: "Mesozoic",
  },
  {
    id: "new-zealand",
    title: "New Zealand",
    description:
      "Macrostrat's New Zealand project: measured sections down the South Island, Late Cretaceous to Recent. Overhead, because the point here is how much ground the project covers.",
    view: camera(-45.2, 170.2, 7.6, { pitch: 0, bearing: 0 }),
    columnID: 1030,
  },
  {
    id: "black-hills",
    title: "The Black Hills",
    description:
      "A Laramide dome that lifts Precambrian basement through its Paleozoic and Mesozoic cover — a bullseye best read from straight above.",
    view: camera(44.0, -103.6, 8.6, { pitch: 0, bearing: 0 }),
    columnID: 512,
  },
];

export function areaByID(id: string): FeaturedArea | null {
  return featuredAreas.find((area) => area.id === id) ?? null;
}

/** The area the server opens on: the same one all day, so the page caches and a
 * reader who comes back sees what they saw. */
export function featuredAreaForToday(date = new Date()): FeaturedArea {
  const start = Date.UTC(date.getUTCFullYear(), 0, 1);
  const dayOfYear = Math.floor((date.getTime() - start) / 86400000);
  return featuredAreas[dayOfYear % featuredAreas.length];
}
