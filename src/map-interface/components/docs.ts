import hyper from "@macrostrat/hyper";
import styles from "./docs.module.styl";
import { useInView } from "react-intersection-observer";

const h = hyper.styled(styles);

export function DocsVideo({ slug, lazy = true }) {
  const { ref, inView } = useInView({ triggerOnce: true });
  let src = null;
  if (inView || !lazy) {
    src = `https://macrostrat-media.s3.amazonaws.com/maps/docs/${slug}.mp4`;
  }

  return h("video", {
    ref,
    autoPlay: true,
    loop: true,
    playsInline: true,
    muted: true,
    type: "video/mp4",
    src,
  });
}

export function NewSwatch({ children }) {
  return h("span.new-swatch", children);
}

export function Version({ spec, date }) {
  return h("h2.version", [
    h("span.version-name", ["Version ", h("code", spec)]),
    h("span.date", date),
  ]);
}
