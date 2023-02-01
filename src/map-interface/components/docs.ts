import hyper from "@macrostrat/hyper";
import styles from "./docs.module.styl";
import { useInView } from "react-intersection-observer";
import { Link } from "react-router-dom";
import { HashLink } from "react-router-hash-link";
import classNames from "classnames";

const h = hyper.styled(styles);

function DocsMediaFile({ href, lazy = true, className }) {
  const { ref, inView } = useInView({ triggerOnce: true });
  let src = null;
  if (inView || !lazy) {
    src = `https://macrostrat-media.s3.amazonaws.com/maps/docs/${href}`;
  }

  if (href.endsWith(".png")) {
    return h("img", {
      ref,
      src,
      className,
    });
  }
  return h("video", {
    ref,
    autoPlay: true,
    loop: true,
    playsInline: true,
    muted: true,
    type: "video/mp4",
    src,
    className,
  });
}

export function DocsMedia({ children, width, float = "right", ...rest }) {
  const className = classNames({
    [float]: float != null,
    captioned: children != null,
  });
  return h("figure.documentation-figure", { style: { width }, className }, [
    h(DocsMediaFile, rest),
    h.if(children != null)("figcaption.caption", children),
  ]);
}

export function DocsVideo({ slug, lazy = true, className }) {
  const { ref, inView } = useInView({ triggerOnce: true });
  let src = null;
  if (inView || !lazy) {
    src = `https://macrostrat-media.s3.amazonaws.com/maps/docs/${slug}.mp4`;
  }

  return h("video.documentation-video-standalone", {
    ref,
    autoPlay: true,
    loop: true,
    playsInline: true,
    muted: true,
    type: "video/mp4",
    src,
    className,
  });
}

export function NewSwatch({ children, version = 0 }) {
  return h(
    HashLink,
    { to: `/changelog#version-${version}`, className: "new-swatch" },
    children
  );
}

export function Version({ spec, date }) {
  return h("h2.version", { id: `version-${spec}` }, [
    h("span.version-name", ["Version ", h("code", spec)]),
    h("span.date", date),
  ]);
}
