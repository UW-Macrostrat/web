import h from "@macrostrat/hyper";

export function DocsVideo({ slug }) {
  return h("video", {
    autoPlay: true,
    loop: true,
    playsInline: true,
    muted: true,
    type: "video/mp4",
    src: `https://macrostrat-media.s3.amazonaws.com/maps/docs/${slug}.mp4`,
  });
}
