import { Dialog, Button } from "@blueprintjs/core";
import { useEffect, useState } from "react";
import { JSONView } from "@macrostrat/ui-components";
import { usePageContext } from "vike-react/usePageContext";
import h from "./page-admin.module.sass";

export function PageAdminConsole({ className }) {
  const [isOpen, setIsOpen] = usePageAdminIsOpen();
  const [isAdminButtonShown, _] = usePageAdminButtonIsShown();

  return h("div", { className }, [
    h.if(isAdminButtonShown)(Button, {
      onClick: () => setIsOpen(true),
      minimal: true,
      icon: "cog",
    }),
    h(
      Dialog,
      {
        isOpen,
        onClose: () => setIsOpen(false),
        title: "Page info",
        className: "page-admin",
      },
      h("div.dialog-content.bp5-dialog-content", [h(PageContextViewer)])
    ),
    h("span.__render_alarm__"),
  ]);
}

function PageContextViewer() {
  return h(JSONView, { data: usePageContext(), hideRoot: true });
}

function usePageAdminButtonIsShown() {
  // Show the page admin console only if the appropriate query parameter is set
  // OR if the user presses shift+alt+I
  const [isAdminShown, setIsAdminShown] = usePageAdminIsOpen();
  const [isAdminButtonShown, setIsAdminButtonShown] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "I" && event.shiftKey) {
        setIsAdminButtonShown((d) => {
          return !d;
        });
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return [isAdminButtonShown || isAdminShown, setIsAdminButtonShown];
}

function usePageAdminIsOpen(): [boolean, (isOpen: boolean) => void] {
  const [isOpen, _setIsOpen] = useState(false);

  // Check if the appropriate query parameter is set
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isOpen = params.get("show") == "admin";
    _setIsOpen(isOpen);
  }, []);

  function setIsOpen(isOpen: boolean) {
    const params = new URLSearchParams(window.location.search);
    if (isOpen) {
      params.set("show", "admin");
    } else {
      params.delete("show");
    }
    const search = params.toString();
    let url = window.location.pathname;
    if (search != null && search.length > 0) {
      url += `?${search}`;
    }
    window.history.replaceState({}, "", url);
    _setIsOpen(isOpen);
  }

  return [isOpen, setIsOpen];
}
