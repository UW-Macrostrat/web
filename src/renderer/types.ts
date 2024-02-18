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
    randomSeed?: string;
    pageStyle?: PageStyle;
    supportsDarkMode?: boolean;
    documentProps?: {
      title?: string;
      description?: string;
    };
  };
};

type OurPageContextServer = PageContextServerBase<Page> & PageContextCustom;
type OurPageContextClient = PageContextClientBase<Page> & PageContextCustom;

type PageContext = OurPageContextClient | OurPageContextServer;
