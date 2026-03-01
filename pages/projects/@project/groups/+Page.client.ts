import h from "./main.module.sass";
import { Link, Identifier } from "~/components";
import { useData } from "vike-react/useData";

/**
 * Jotai provides a composable approach to state management
 * that can be used to add behaviors iteratively
 */

import { onDemand } from "~/_utils";

const ColumnMapContainer = onDemand(() => {
  return import("#/columns/map.client.ts").then((d) => d.ColumnMapContainer);
});

export function Page() {
  const { project, columnGroups } = useData();
  const project_id = project?.project_id;
  return h("div.flex-row", [
    h(
      "ul.column-groups",
      columnGroups.map((d) => {
        return h(ColumnGroupCols, {
          data: d,
          key: d.col_group_id,
        });
      })
    ),
    h("div.sidebar", [
      h("div.sidebar-content", [
        h(ColumnMapOuter, {
          projectID: project_id,
        }),
      ]),
    ]),
  ]);
}

function ColumnMapOuter({ projectID }) {
  return h(ColumnMapContainer, {
    //columnIDs,
    projectID,
    className: "column-map-container",
  });
}

function ColumnGroupCols({ data }) {
  const { name } = data;
  return h(
    "li.column-group",
    h("div.group-info", [
      h(
        Link,
        { href: `/projects/${data.project_id}/groups/${data.col_group_id}` },
        name
      ),
      h(Identifier, {
        identifier: data.col_group_id,
        className: "group-identifier",
      }),
    ])
  );
}
