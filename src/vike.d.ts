// Vike pageContext
// As described in https://vike.dev/pageContext#typescript

import type {
  /*
          // When using Client Routing https://vike.dev/clientRouting
          PageContextBuiltInClientWithClientRouting as PageContextBuiltInClient
          /*
   */
  // For code loaded in client and server
  PageContextWithServerRouting as PageContext,
  // For code loaded in client only
  PageContextClientWithServerRouting as PageContextClient,
  // For code loaded in server only
  PageContextServer as PageContextServer,
  SourcesConfigStandard,
  SourcesConfigCumulative,
} from "vike/types";

import { Item, PageInfo } from "~/_utils/helpers.ts";
import type { GeoLocation } from "~/_utils/geolocation";

export type PageProps = Record<string, unknown>;
export type PageStyle = "content" | "fullscreen";

export type DocumentProps = {
  title?: string;
  description?: string;
  scripts?: string[];
};

type User = { groups: string[] };

declare global {
  namespace Vike {
    interface Config {
      description?: string;
      supportsDarkMode?: boolean;
      scripts?: string[];
    }
    interface PageContext {
      pageProps?: PageProps;
      pageInfo?: PageInfo;
      urlPathname: string;
      user?: User;
      geo?: GeoLocation | null;
      // Set server-side: access token gone/expired but a refresh token is
      // present, so the client should attempt one silent refresh on load.
      canRefresh?: boolean;
      breadcrumbs?: Item[];
      macrostratLogoFlavor?: string;
      mdxContent?: string;
      environment: Record<string, string>;
      exports: {
        pageStyle?: PageStyle;
        documentProps?: DocumentProps;
      };
      sources: {
        pageInfo: SourcesConfigCumulative;
      };
      // Refine type of pageContext.Page (it's `unknown` by default)
      //Page: () => React.ReactNode;
    }
  }
}

// Tell TypeScript this file isn't an ambient module:
export {};
