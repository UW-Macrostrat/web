import hyper from "@macrostrat/hyper";
import { ReactElement, ReactFragment, useEffect } from "react";
import styles from "./edit-menu.module.sass";
import { useState } from "react";
import "~/styles/global.styl";
import { Icon } from "@blueprintjs/core";
import EditTable from "./edit-table";

const h = hyper.styled(styles);

interface TableProps {}

interface IconButtonProps {
  icon: string;
  name: string;
  onClick: () => void;
}

function IconButton({ icon, name, onClick }: IconButtonProps) {
  return h("button.icon-button", { onClick: onClick }, [
    h("div.icon-container", {}, [h(Icon, { icon: icon, size: 24 })]),
    h("span.icon-label", {}, name),
  ]);
}

interface EditMenuProps {
  setMenu: () => void;
}

function EditMenu({
  setMenu,
}: EditMenuProps): ReactElement<{}> | ReactElement | ReactFragment {
  return h("div.edit-menu", {}, [
    h(IconButton, {
      icon: "polygon-filter",
      name: "Polygons",
      onClick: () => setMenu("polygons"),
    }),
  ]);
}

interface EditTableDrawerProps {
  menu: string;
}

function EditTableDrawer({ menu, children }: EditTableDrawerProps) {
  const [maxWidth, setMaxWidth] = useState(0);
  const [startPosition, setStartPosition] = useState(0);

  useEffect(() => {
    setMaxWidth(menu != undefined ? window.innerWidth / 2 : 0);
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
  const [menu, setMenu] = useState(undefined);

  return h("div.interface", {}, [
    menu == undefined ? h(EditMenu, { setMenu }) : null,
    h(EditTableDrawer, { menu }, [
      menu == "polygons"
        ? h(
            EditTable,
            { url: `http://localhost:8000/sources/${source_id}/polygons` },
            []
          )
        : null,
    ]),
  ]);
}
