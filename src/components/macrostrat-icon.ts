/** A dynamic icon for Macrostrat */
import hyper from "@macrostrat/hyper";
import { resolvePattern } from "~/_utils";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./icon.module.sass";
import chroma from "chroma-js";
import { hexToCSSFilter } from "hex-to-css-filter";
import { navigate } from "vike/client/router";
import { useLinkIsActive } from "~/renderer/Link";
import { usePageContext } from "~/renderer/page-context";

function useInitialFlavor() {
  const ctx = usePageContext();
  return ctx?.macrostratLogoFlavor;
}

const h = hyper.styled(styles);

type Flavor = {
  name: string;
  color: string;
  pattern: string;
  scale?: number;
};

const flavors: Flavor[] = [
  { name: "sandstone", color: "yellow", pattern: "607" },
  { name: "dolomite", color: "dodgerblue", pattern: "632" },
  { name: "shale", color: "palegreen", pattern: "616" },
  { name: "granite", color: "pink", pattern: "723", scale: 1.2 },
  { name: "limestone", color: "purple", pattern: "627" },
  { name: "basalt", color: "#40061e", pattern: "717" },
  { name: "gabbro", color: "black", pattern: "720", scale: 0.8 },
];

function useFlavor(
  name: string | null | undefined
): [Flavor, (name: string | null | undefined) => void] {
  /** Use a specific flavor or a random one */
  const initialFlavor = useInitialFlavor();
  const [flavor, setFlavor_] = useState(
    () => flavors.find((d) => d.name === initialFlavor) ?? flavors[0]
  );
  const setFlavor = useCallback(
    (name: string | null | undefined) => {
      let flavor: Flavor;
      if (name == null) {
        const randomNumber = Math.random();
        flavor = flavors[Math.floor(randomNumber * flavors.length)];
      } else {
        flavor = flavors.find((d) => d.name === name);
      }
      setFlavor_(flavor);
    },
    [setFlavor_]
  );
  return [flavor, setFlavor];
}

function getLineHeight(el) {
  const style = window?.getComputedStyle(el);
  if (style == null) return null;
  return parseFloat(style.lineHeight.replace("px", ""));
}

export function MacrostratIcon({
  name,
  size: _sz = null,
  width,
  height,
  radius = null,
  style,
  ...rest
}) {
  const [flavor, setFlavor] = useFlavor(name);
  const { color, pattern, scale = 1 } = flavor;
  const ref = useRef(null);
  const [size, setSize] = useState(_sz);

  const url = resolvePattern(pattern);
  const isActive = useLinkIsActive("/");

  useEffect(() => {
    const el = ref.current;
    if (el == null) return;
    const { filter } = hexToCSSFilter(chroma(color).hex());
    el.style.filter = filter.slice(0, -1) + " opacity(0.8)";
  }, [ref.current, color]);

  useEffect(() => {
    const el = ref.current;
    if (el == null) return;
    setSize(_sz ?? width ?? height ?? getLineHeight(el));
  }, [ref.current]);

  const borderRadius = radius ?? size / 8;

  return h(
    "span.icon-container",
    {
      style: {
        borderColor: color,
        width: width ?? size,
        height: height ?? size,
        borderRadius,
      },
      onClick() {
        if (isActive) {
          setFlavor();
        } else {
          navigate("/");
        }
      },
      ...rest,
    },
    h("img.macrostrat-icon", {
      src: url,
      style: {
        width: size * 4 * scale,
        height: size * 4 * scale,
        marginLeft: -size,
        marginTop: -size,
      },
      ref,
    })
  );
}

/* Simple seeded random number generator */
function randomGenerator(seed) {
  var m = 2 ** 35 - 31;
  var a = 185852;
  var s = seed % m;
  return function () {
    return (s = (s * a) % m) / m;
  };
}
