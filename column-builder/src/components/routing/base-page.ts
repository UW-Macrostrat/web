import { hyperStyled } from "@macrostrat/hyper";
import styles from "../comp.module.scss";
import { useRouter } from "next/router";
import { Breadcrumbs, BreadcrumbProps } from "@blueprintjs/core";
import { ReactChild } from "react";
import { getIdHierarchy } from "./routing-helpers";

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
  predicate?: any;
}

/* 
Creates the breadcrumbs at the top of each page based on the router query
*/
export function BasePage(props: BasePageProps) {
  const router = useRouter();
  const { query } = props;

  const filterCrumbs = (obj: CrumbsI) => {
    if (Object.keys(query).length == 0) {
      if (obj.text == "Projects") {
        return true;
      }
      return false;
    }
    for (let i = 0; i < Object.keys(query).length; i++) {
      if (!obj.predicate.includes(Object.keys(query)[i])) {
        return false;
      }
    }
    return true;
  };

  const onClick = async () => {
    return await getIdHierarchy(query);
  };
  const breadCrumbs: CrumbsI[] = [
    {
      text: "Projects",
      onClick: async () => {
        router.push("/");
      },
      predicate: [
        "project_id",
        "col_group_id",
        "col_id",
        "section_id",
        "unit_id",
      ],
    },
    {
      text: "Column Groups",
      onClick: async () => {
        const { project_id } = await onClick();
        router.push(`/column-groups/${project_id}`);
      },
      predicate: [
        "project_id",
        "col_group_id",
        "col_id",
        "section_id",
        "unit_id",
      ],
    },
    {
      text: "Sections",
      onClick: async () => {
        const { col_id } = await onClick();
        router.push(`/column/${col_id}`);
      },
      predicate: ["col_id", "section_id", "unit_id"],
    },
    {
      text: "Units",
      onClick: async () => {
        const { section_id } = await onClick();
        router.push(`/units/${section_id}`);
      },
      predicate: ["section_id", "unit_id"],
    },
  ].filter(filterCrumbs);

  return h("div.page", [
    h("div.bread-crumbs", [h(Breadcrumbs, { items: breadCrumbs })]),
    props.children,
  ]);
}
