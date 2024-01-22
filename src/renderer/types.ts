export type { PageContext, PageContextClient, PageContextServer, PageProps };

import type {
  /*
          // When using Client Routing https://vike.dev/clientRouting
          PageContextBuiltInClientWithClientRouting as PageContextBuiltInClient
          /*/
  // When using Server Routing
  PageContextBuiltInClientWithServerRouting as PageContextBuiltInClient,
  PageContextBuiltInServer,
} from "vike/types";

type Page = (pageProps: PageProps) => React.ReactElement;
type PageProps = Record<string, unknown>;

export type PageStyle = "content" | "fullscreen";

export type PageContextCustom = {
  Page: Page;
  pageProps?: PageProps;
  urlPathname: string;
  exports: {
    pageStyle?: PageStyle;
    documentProps?: {
      title?: string;
      description?: string;
    };
  };
};

type PageContextServer = PageContextBuiltInServer<Page> & PageContextCustom;
type PageContextClient = PageContextBuiltInClient<Page> & PageContextCustom;

type PageContext = PageContextClient | PageContextServer;
