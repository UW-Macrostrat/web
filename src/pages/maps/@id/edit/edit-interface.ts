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

function WidthAdjustablePanel({ children }: { children: ReactNode }) {
  const [maxWidth, setMaxWidth] = useState(0);
  const [startPosition, setStartPosition] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setMaxWidth(window.innerWidth / 2);
  }, []);

  return h("div.edit-table-drawer", { style: { maxWidth: maxWidth + "px" } }, [
    h(
      "div.width-adjuster",
      {
        onDragStart: (e) => {
          setStartPosition(e.clientX);
        },
        onDragEnd: (e) => {
          const dx = e.clientX - startPosition;
          const newMaxWidth = maxWidth - dx;
          setMaxWidth(newMaxWidth);
        },
        draggable: true,
      },
      []
    ),
    children,
  ]);
}

interface EditInterfaceProps {
  title?: string;
  parentRoute?: string;
  source_id?: number;
}

export default function EditInterface({ source_id }: EditInterfaceProps) {
  const [activePage, setActivePage] = useState(null);

  return h(
    WidthAdjustablePanel,
    h([
      h.if(activePage == null)(EditMenu, { setActivePage }),
      h.if(activePage == "polygons")(
        EditTable,
        { url: `http://localhost:8000/sources/${source_id}/polygons` },
        []
      ),
    ])
  );
}
