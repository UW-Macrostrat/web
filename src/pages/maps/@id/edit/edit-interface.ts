import hyper from "@macrostrat/hyper";
import { ReactNode, useEffect } from "react";
import styles from "./edit-menu.module.sass";
import { useState } from "react";
import "~/styles/global.styl";
import { Icon, Button } from "@blueprintjs/core";
import EditTable from "./edit-table";

const h = hyper.styled(styles);

interface TableProps {}

interface EditMenuProps {
  setActivePage: (page: string) => void;
}

function EditMenu({ setActivePage }: EditMenuProps) {
  return h("div.edit-menu", {}, [
    h(Button, {
      icon: "polygon-filter",
      text: "Polygons",
      large: true,
      onClick: () => setActivePage("polygons"),
    }),
  ]);
}

interface EditTableDrawerProps {
  menu: string;
  children: ReactNode;
}

function EditTableDrawer({ menu, children }: EditTableDrawerProps) {
  const [maxWidth, setMaxWidth] = useState(0);
  const [startPosition, setStartPosition] = useState(0);

  useEffect(() => {
    setMaxWidth(menu != null ? window.innerWidth / 2 : 0);
  }, [menu]);

  return h("div.edit-table-drawer", { style: { maxWidth: maxWidth + "px" } }, [
    children,
    h(
      "div.width-adjuster",
      {
        onDragStart: (e) => {
          setStartPosition(e.clientX);
        },
        onDragEnd: (e) => {
          setMaxWidth(maxWidth + (e.clientX - startPosition));
        },
        draggable: true,
      },
      []
    ),
  ]);
}

interface EditInterfaceProps {
  title?: string;
  parentRoute?: string;
  source?: number;
}

export default function EditInterface({
  title,
  parentRoute,
  source_id,
}: EditInterfaceProps) {
  const [activePage, setActivePage] = useState(undefined);

  return h("div.interface", {}, [
    h.if(activePage == null)(EditMenu, { setActivePage }),
    h(EditTableDrawer, { menu: activePage }, [
      h.if(activePage == "polygons")(
        EditTable,
        { url: `http://localhost:8000/sources/${source_id}/polygons` },
        []
      ),
    ]),
  ]);
}
