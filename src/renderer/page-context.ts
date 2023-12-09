// `usePageContext` allows us to access `pageContext` in any React component.
// See https://vike.dev/pageContext-anywhere

import React, { useContext } from "react";
import type { PageContext } from "./types";
import h from "@macrostrat/hyper";

const Context = React.createContext<PageContext>(
  undefined as unknown as PageContext
);

export function PageContextProvider({
  pageContext,
  children,
}: {
  pageContext: PageContext;
  children: React.ReactNode;
}) {
  return h(Context.Provider, { value: pageContext }, children);
}

export function usePageContext() {
  const pageContext = useContext(Context);
  return pageContext;
}
