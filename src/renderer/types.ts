export type { PageContextClient, PageContextServer, PageProps };

import type {
  /*
          // When using Client Routing https://vike.dev/clientRouting
          PageContextBuiltInClientWithClientRouting as PageContextBuiltInClient
          /*/
  // When using Server Routing
  PageContextServer as PageContextBuiltInServer,
  PageContextClient as PageContextClientBase,
  PageContextServer as PageContextServerBase,
} from "vike/types";

type Page = (pageProps: PageProps) => React.ReactElement;
type PageProps = Record<string, unknown>;

export type PageStyle = "content" | "fullscreen";

export type DocumentProps = {
  title?: string;
  description?: string;
  scripts?: string[];
};

type User = { groups: string[] };

export type PageContextCustom = {
  Page: Page;
  pageProps?: PageProps;
  urlPathname: string;
  user?: User;
  macrostratLogoFlavor?: string;
  config: PageContextBuiltInServer["config"] & {
    clientRouting?: boolean;
    supportsDarkMode?: boolean;
    isolateStyles?: boolean;
    hydrationCanBeAborted?: boolean;
  };
  exports: {
    title?: string;
    description?: string;
    pageStyle?: PageStyle;
    supportsDarkMode?: boolean;
    documentProps?: DocumentProps;
  };
};

type PageContextServer = PageContextServerBase<Page> & PageContextCustom;
type PageContextClient = PageContextClientBase<Page> & PageContextCustom;

export type PageContext = PageContextClient | PageContextServer;
