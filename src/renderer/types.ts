export type { PageContext, PageContextClient, PageContextServer, PageProps };

import { PageContextBuiltInServerInternal } from "vike/dist/esm/shared/types";
import type {
  /*
          // When using Client Routing https://vike.dev/clientRouting
          PageContextBuiltInClientWithClientRouting as PageContextBuiltInClient
          /*/
  // When using Server Routing
  PageContextBuiltInClientWithServerRouting as PageContextBuiltInClient,
  PageContextClient as PageContextClientBase,
  PageContextServer as PageContextServerBase,
} from "vike/types";

type Page = (pageProps: PageProps) => React.ReactElement;
type PageProps = Record<string, unknown>;

export type PageStyle = "content" | "fullscreen";

type User = { groups: string[] };

export type PageContextCustom = {
  Page: Page;
  pageProps?: PageProps;
  urlPathname: string;
  user?: User;
  macrostratLogoFlavor?: string;
  config: PageContextBuiltInServerInternal["config"] & {
    clientRouting?: boolean;
    supportsDarkMode?: boolean;
    isolateStyles?: boolean;
    hydrationCanBeAborted?: boolean;
  };
  exports: {
    pageStyle?: PageStyle;
    supportsDarkMode?: boolean;
    documentProps?: {
      title?: string;
      description?: string;
    };
  };
};

type PageContextServer = PageContextServerBase<Page> & PageContextCustom;
type PageContextClient = PageContextClientBase<Page> & PageContextCustom;

export type PageContext = PageContextClient | PageContextServer;
