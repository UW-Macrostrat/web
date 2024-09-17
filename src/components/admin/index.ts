import { Button } from "@blueprintjs/core";
import { useEffect } from "react";
import h from "./page-admin.module.sass";
import loadable from "@loadable/component";
import { create } from "zustand";

const useStore: any = create((set) => {
  return {
    isOpen: false,
    isButtonShown: false,
    setIsOpen(isOpen) {
      set({ isOpen });
    },
    toggle() {
      set((state) => ({ isOpen: !state.isOpen }));
    },
    toggleButton() {
      set((state) => {
        let isOpen = state.isButtonShown ? false : state.isOpen;
        return { isButtonShown: !state.isButtonShown, isOpen };
      });
    },
    buttonRef: null,
    setButtonRef(ref) {
      console.log("Setting button ref");
      set({ buttonRef: ref });
    },
  };
});

function PageAdmin({ isOpen, setIsOpen }) {
  if (!isOpen) return null;

  const Window = loadable(() =>
    import("./_inner").then((mod) => mod.PageAdminInner)
  );

  return h(Window, { isOpen, setIsOpen });
}

export function PageAdminConsole({ className }) {
  const [isOpen, setIsOpen] = usePageAdminIsOpen();
  const buttonRef = useStore((state) => state.buttonRef);
  usePageAdminButtonEffect();

  return h("div", { className }, [
    h(PageAdmin, { isOpen, setIsOpen }),
    h.if(buttonRef == null)(PageAdminButton, { setRef: false }),
  ]);
}

export function PageAdminButton({ setRef = true }) {
  const onClick = useStore((state) => state.toggle);
  const _setRef = useStore((state) => state.setButtonRef);
  const isShown = useStore((state) => state.isButtonShown);
  const ref = (el) => {
    if (setRef) _setRef(el);
  };

  return h.if(isShown)(Button, {
    onClick,
    className: "page-admin-button",
    ref,
    minimal: true,
    small: true,
    icon: "cog",
  });
}

function usePageAdminButtonEffect() {
  // Show the page admin console only if the appropriate query parameter is set
  // OR if the user presses shift+alt+I
  const toggleButton = useStore((s) => s.toggleButton);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "I" && event.shiftKey) {
        toggleButton();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);
}

function usePageAdminIsOpen(): [boolean, (isOpen: boolean) => void] {
  const isOpen = useStore((state) => state.isOpen);
  const _setIsOpen = useStore((state) => state.setIsOpen);

  // Check if the appropriate query parameter is set
  useEffect(() => {
    if (window == null) return;
    const params = new URLSearchParams(window.location.search);
    const isOpen = params.get("show") == "admin";
    _setIsOpen(isOpen);
  }, []);

  function setIsOpen(isOpen: boolean) {
    if (window == null) return;
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
