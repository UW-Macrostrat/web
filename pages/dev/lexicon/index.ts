import h from "@macrostrat/hyper";
import { webAssetsPrefix } from "@macrostrat-web/settings";

export function Image({ src, className, width, height }) {
  const srcWithAddedPrefix = webAssetsPrefix + "/main-page/" + src;
  return h("img", { src: srcWithAddedPrefix, className, width, height });
}
