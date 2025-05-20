import { onDemand } from "~/_utils";

export const ColumnMap = onDemand(() => import("./map").then((mod) => mod.ColumnMap));
