import { Link, useNavigate } from "react-router-dom";
import h from "@macrostrat/hyper";
export const siftPrefix = "";

export function SiftLink(props) {
  const { to, ...rest } = props;
  return h(Link, { to: siftPrefix + to, ...rest });
}

export function useSiftNavigate() {
  const navigate = useNavigate();
  return (to: string) => navigate(siftPrefix + to);
}
