/** A dynamic icon for Macrostrat */
import hyper from "@macrostrat/hyper";
import { resolvePattern } from "~/_utils";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./icon.module.sass";
import chroma from "chroma-js";
import { hexToCSSFilter } from "hex-to-css-filter";
import { navigate } from "vike/client/router";
import { useLinkIsActive } from "~/renderer/Link";

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
];

function useFlavor(name): [Flavor, (name: string | null | undefined) => void] {
  /** Use a specific flavor or a random one */
  const stateCreator = useCallback(
    (name = undefined, randomNumber = undefined) => {
      if (name == null) {
        const random = randomNumber ?? Math.random();
        return flavors[Math.floor(random * flavors.length)];
      }
      return flavors.find((d) => d.name === name);
    },
    [name]
  );
  const [flavor, setFlavor] = useState(stateCreator);
  return [
    flavor,
    (name: string | null | undefined) =>
      setFlavor(stateCreator(name, Math.random())),
  ];
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
