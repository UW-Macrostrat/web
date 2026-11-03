/** Which compilation the map draws and asks about -- see `~/_utils/compilations`.
 *
 * Unset, the map draws the servers' default and leaves it out of the URL; a
 * chosen slug is carried in the hash and drawn from `/map/{slug}`. */
export {
  DEFAULT_COMPILATION,
  LEGACY_COMPILATION,
  applyCompilationTiles,
  compilationOrDefault,
  mapQuerySource,
  compilationTilesURL,
  tileRequestTransform,
} from "~/_utils/compilations";
