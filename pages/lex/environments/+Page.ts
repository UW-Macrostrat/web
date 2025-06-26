import h from "./main.module.scss";
import { PageBreadcrumbs, StickyHeader } from "~/components";
import { Popover } from "@blueprintjs/core";
import { useState } from "react";
import { ContentPage } from "~/layouts";
import { asChromaColor } from "@macrostrat/color-utils";
import { useData } from "vike-react/useData";
import { LexListPage } from "../economics/+Page";
import { route } from "#/dev/map/rockd-strabospot/+route";

export function Page() {
  const { res } = useData();  
  return h(LexListPage, { res, title: "Environments", route: "environments", id: "environ_id" });
}