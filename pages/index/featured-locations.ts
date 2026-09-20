/** Places the homepage hero can show: each lies inside a Macrostrat column
 * (checked against the columns API, 2026-09-20). Until the hero can use the
 * reader's own location (see the "User location management" feature area),
 * one of these is picked per day. */
export interface FeaturedLocation {
  name: string;
  lat: number;
  lng: number;
  zoom: number;
}

export const featuredLocations: FeaturedLocation[] = [
  { name: "Grand Canyon, Arizona", lat: 36.1, lng: -112.1, zoom: 7 },
  { name: "Moab, Utah", lat: 38.57, lng: -109.55, zoom: 7 },
  { name: "Black Hills, South Dakota", lat: 44.05, lng: -103.5, zoom: 7 },
  { name: "Baraboo Hills, Wisconsin", lat: 43.07, lng: -89.4, zoom: 7 },
  { name: "Cumberland Plateau, Tennessee", lat: 36.0, lng: -84.0, zoom: 7 },
];

/** The same place all day, so the page caches and a reader who returns sees
 * what they saw. */
export function featuredLocationForToday(date = new Date()): FeaturedLocation {
  const start = Date.UTC(date.getUTCFullYear(), 0, 1);
  const dayOfYear = Math.floor((date.getTime() - start) / 86400000);
  return featuredLocations[dayOfYear % featuredLocations.length];
}
