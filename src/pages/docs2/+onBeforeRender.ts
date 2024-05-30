import { buildPageIndex } from "@macrostrat-web/text-toolchain";
import { renderToString } from "react-dom/server";
import { PageContext } from "vike/types";
import h from "@macrostrat/hyper";
const modules = import.meta.glob("../../../content/**/*.md");
import { join } from "path";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const contentDirName = "../../../content";
const contentDir = join(__dirname, contentDirName);

const [pageIndex, permalinkIndex] = buildPageIndex(contentDir);

type OurPageContext = {
  mdxContent: string | null;
  title: string | null;
};

export async function onBeforeRender(
  pageContext: PageContext
): Promise<{ pageContext: OurPageContext }> {
  /** Server-side render hook to render Markdown pages */

  console.log(pageContext.urlPathname);
  const prefix = "/docs2";

  // Normalize the URL pathname
  let key = pageContext.urlPathname;
  if (key.startsWith(prefix)) {
    key = key.slice(prefix.length);
  }
  if (key == "") {
    key = "/";
  }

  const ctx = permalinkIndex[key];
  const mdxContentFile = ctx?.contentFile;

  console.log(mdxContentFile, ctx, pageIndex, permalinkIndex);

  const fileName = join(contentDirName, mdxContentFile);
  const pageFile = modules[fileName];

  console.log(modules);
  console.log(pageIndex, fileName);

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

  console.log(mdxContent);

  const title = ctx?.title;
  return {
    pageContext: {
      mdxContent,
      title,
    },
  };
}

export const passToClient = ["mdxContentFile", "mdxContent", "title"];
