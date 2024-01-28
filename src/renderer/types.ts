export type { PageContext, PageContextClient, PageContextServer, PageProps };

import { PageContextBuiltInServerInternal } from "vike/dist/esm/shared/types";
import type {
  /*
          // When using Client Routing https://vike.dev/clientRouting
          PageContextBuiltInClientWithClientRouting as PageContextBuiltInClient
          /*/
  // When using Server Routing
  PageContextBuiltInClientWithServerRouting as PageContextBuiltInClient,
  PageContextBuiltInServer,
  PageContextBuiltIn,
} from "vike/types";

type Page = (pageProps: PageProps) => React.ReactElement;
type PageProps = Record<string, unknown>;

export type PageStyle = "content" | "fullscreen";

export type PageContextCustom = {
  Page: Page;
  pageProps?: PageProps;
  urlPathname: string;
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

type PageContextServer = PageContextBuiltInServer<Page> & PageContextCustom;
type PageContextClient = PageContextBuiltInClient<Page> & PageContextCustom;

type PageContext = PageContextClient | PageContextServer;
