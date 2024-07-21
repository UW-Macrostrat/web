import h from "@macrostrat/hyper";

export function Image({ src, className, width, height }) {
    const srcWithAddedPrefix = "https://storage.macrostrat.org/assets/web/main-page/" + src;
    return h("img", {src: srcWithAddedPrefix, className, width, height})
}