/** Which compilation the map draws and asks about -- see `~/_utils/compilations`.
 *
 * The default, `carto`, is left out of the URL; any other slug is carried in
 * the hash, drawn per request, and sent with the delegated token. */
export {
  DEFAULT_COMPILATION,
  LEGACY_COMPILATION,
  applyCompilationTiles,
  compilationOrDefault,
  compilationTilesURL,
  tileRequestTransform,
} from "~/_utils/compilations";
