import { Link, useNavigate } from "react-router-dom";
import h from "@macrostrat/hyper";
import { ReactNode } from "react";
export const siftPrefix = "/sift";

export const siftImages = import.meta.glob("../../img/*.{png,jpg,jpeg}", {
  eager: true,
});

console.log(siftImages);

export function SiftLink(props): ReactNode {
  const { to, ...rest } = props;
  return h(Link, { to, ...rest });
}

export function useSiftNavigate() {
  const navigate = useNavigate();
  return (to: string) => navigate(to);
}

export function SiftImage(props) {
  const { name, ...rest } = props;
  const key = Object.keys(siftImages).find((k) => k.includes(name));

  return h("img", { src: siftImages[key].default, ...rest });
}
