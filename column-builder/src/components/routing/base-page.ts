import { hyperStyled } from "@macrostrat/hyper";
import styles from "../comp.module.scss";
import { useRouter } from "next/router";
import { Breadcrumbs, BreadcrumbProps } from "@blueprintjs/core";
import { ReactChild } from "react";

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

interface BasePageProps {
  query: QueryI;
  children: ReactChild;
}

interface CrumbsI extends BreadcrumbProps {
  predicate: string;
}

/* 
Creates the breadcrumbs at the top of each page based on the router query
*/
export function BasePage(props: BasePageProps) {
  const router = useRouter();
  const { query } = props;
  console.log("basepageQuery", query);

  const filterCrumbs = (obj: CrumbsI) => {
    if (obj.text == "Projects") {
      return true;
    }

    if (typeof query[obj.predicate] == "undefined") return false;
    return true;
  };

  const breadCrumbs: CrumbsI[] = [
    {
      text: "Projects",
      onClick: async () => {
        router.push("/");
      },
      predicate: "",
    },
    {
      text: "Column Groups",
      onClick: async () => {
        router.push(`/column-groups/${query.project_id}`);
      },
      predicate: "project_id",
    },
    {
      text: "Column",
      onClick: async () => {
        router.push(`/column/${query.col_id}`);
      },
      predicate: "col_id",
    },
    {
      text: "Section",
      onClick: async () => {
        router.push(`/section/${query.section_id}`);
      },
      predicate: "section_id",
    },
    {
      text: "Unit",
      onClick: async () => {
        router.push(`/unit/${query.unit_id}/edit`);
      },
      predicate: "unit_id",
    },
  ].filter(filterCrumbs);

  return h("div.page", [
    h("div.bread-crumbs", [h(Breadcrumbs, { items: breadCrumbs })]),
    props.children,
  ]);
}
