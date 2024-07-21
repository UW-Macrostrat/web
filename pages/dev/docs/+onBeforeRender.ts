import { buildPageIndex } from "@macrostrat-web/text-toolchain";
import { renderToString } from "react-dom/server";
import { PageContext } from "vike/types";
import h from "@macrostrat/hyper";
const modules = import.meta.glob("../../../../content/**/*.md");
import { join } from "path";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const contentDirName = "../../../../content";
const contentDir = join(__dirname, contentDirName);

const [pageIndex, permalinkIndex] = buildPageIndex(contentDir, "/dev/docs");

type OurPageContext = {
  mdxContent: string | null;
  title: string | null;
};

export async function onBeforeRender(
  pageContext: PageContext
): Promise<{ pageContext: OurPageContext }> {
  /** Server-side render hook to render Markdown pages */

  // Normalize the URL pathname
  let key = pageContext.urlPathname;
  if (key == "") {
    key = "/";
  }

  // TODO: If the key is not in the permalink index, we need to return 404
  // but instead we have an internal server errror.
  const ctx = permalinkIndex[key];
  const mdxContentFile = ctx?.contentFile;

  let pageFile = null;

  if (mdxContentFile != null) {
    const fileName = join(contentDirName, mdxContentFile);
    pageFile = modules[fileName];
  }

  if (pageFile == null) {
    return {
      pageContext: {
        mdxContent: null,
      },
    };
  }

  const _mdxContent = pageFile == null ? null : await pageFile();

  const pageContent = h(_mdxContent.default);

  const mdxContent = await renderToString(pageContent);

  const title = ctx?.title;
  return {
    pageContext: {
      mdxContent,
      title,
    },
  };
}

export const passToClient = ["mdxContentFile", "mdxContent", "title"];
