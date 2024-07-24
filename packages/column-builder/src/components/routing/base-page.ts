import React from "react";
import { hyperStyled } from "@macrostrat/hyper";
import styles from "../comp.module.scss";
import { BreadcrumbProps } from "@blueprintjs/core";
import { ReactChild } from "react";
import { ErrorDialog } from "./error-boundary";
import { PostgrestError } from "@supabase/postgrest-js";
const h = hyperStyled(styles);

export interface QueryI {
  project_id?: number;
  col_id?: number;
  section_id?: number;
  unit_id?: number;
  col_group_id?: number;
  strat_name_id?: number;
  name?: string;
}

export interface BasePageProps {
  query: QueryI;
  errors: PostgrestError[];
  children: ReactChild;
}

export interface CrumbsI extends BreadcrumbProps {
  predicate: string;
}

/*
Creates the breadcrumbs at the top of each page based on the router query
*/
export function BasePage(props: BasePageProps) {
  //const router = useRouter();
  const { query, errors = [] } = props;

  // This should really be moved out to a hook.
  //const breadCrumbs: CrumbsI[] = useBreadCrumbs({ router, query });

  return h("div.page", [
    //h("div.bread-crumbs", [h(Breadcrumbs, { items: breadCrumbs })]),
    h.if(errors.length > 0)(ErrorDialog, { errors }),
    h.if(errors.length == 0)(React.Fragment, [props.children]),
  ]);
}
