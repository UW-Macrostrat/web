import h from "@macrostrat/hyper";

export function Image({ src, className, width, height }) {
    const srcWithAddedPrefix = "/img/" + src;
    return h("img", {src: srcWithAddedPrefix, className, width, height})
}