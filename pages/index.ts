import { onDemand } from "~/_utils";
import h from "@macrostrat/hyper";

export const ColumnMap = onDemand(() => import("./map").then((mod) => mod.ColumnMap));

export function BlankImage({ src, className, width, height }) {
    return h("img", {src, className, width, height})
}