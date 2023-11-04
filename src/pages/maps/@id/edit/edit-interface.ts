import hyper from "@macrostrat/hyper";
import { ReactNode, useEffect } from "react";
import styles from "./edit-menu.module.sass";
import { useState } from "react";
import "~/styles/global.styl";
import EditTable from "./edit-table";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { LinkButton } from "~/map-interface/components/buttons";

const h = hyper.styled(styles);

interface TableProps {}

interface EditMenuProps {
  setActivePage: (page: string) => void;
}

function EditMenu({ setActivePage }: EditMenuProps) {
  return h("div.edit-menu", {}, [
    h(LinkButton, {
      icon: "polygon-filter",
      text: "Polygons",
      large: true,
      to: "polygons",
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

  return h(
    "div.width-adjustable-panel",
    { style: { maxWidth: maxWidth + "px" } },
    [
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
      h("div.width-adjustable-panel-content", {}, children),
    ]
  );
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
    // TODO: make this basename dynamic
    h(Router, { basename: `/maps/${source_id}/edit` }, [
      h(Routes, [
        h(Route, {
          path: "",
          element: h(EditMenu, { setActivePage }),
        }),
        h(Route, {
          path: "polygons",
          element: h(EditTable, {
            url: `http://localhost:8000/sources/${source_id}/polygons`,
          }),
        }),
      ]),
    ])
  );
}
