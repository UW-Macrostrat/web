// `usePageContext` allows us to access `pageContext` in any React component.
// See https://vike.dev/pageContext-anywhere

import { usePageContext } from "vike-react/usePageContext";

export { usePageContext };

export function usePageProps() {
  const pageContext = usePageContext();
  console.warn(
    "usePageProps and +onBeforeRender are deprecated. Shift to useData"
  );
  return pageContext?.pageProps ?? {};
}
