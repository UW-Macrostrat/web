import h from "@macrostrat/hyper";
import { ColumnsMap } from "../index";
import { SETTINGS } from "@macrostrat-web/settings";
import { useAPIResult } from "@macrostrat/ui-components";
import { Hierarchy } from "@macrostrat/data-components";
//@ts-nocheck
import axios from "axios";
import { useState } from "react";
import { StratNameHierarchyPage } from "../lex/StratNameHierarchy" 

export function Page() {
    return h(StratNameHierarchyPage, {
        start_name_id: 1, // Default to a known strat name ID
    });
}