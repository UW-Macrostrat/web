import matter from "gray-matter";
import { readFileSync } from "fs";
import slugify from "@sindresorhus/slugify";
import { globSync } from "glob";
import { join } from "path";

export type PageIndex = { [k: string]: string[] };
export type PermalinkIndex = {
  [k: string]: { contentFile: string; title: string };
};

export function buildPageIndex(
  contentDir: string
): [PageIndex, PermalinkIndex] {
  // Walk the tree and generate permalinks for each page
  // Always happens on the server side.

  const globPath = join(contentDir, "**/*.md");
  const replacePattern = new RegExp(`^${contentDir}/`);

  const files = globSync(globPath);
  let pageIndex: PageIndex = {};
  let permalinkIndex: PermalinkIndex = {};

  console.log(files);

  for (const path of files) {
    // Get yaml frontmatter from file
    console.log(path);
    const content = readFileSync(path, "utf8");
    const { data = {} } = matter(content);

    const newPath = path.replace(replacePattern, "");

    let sluggedPath = slugifyPath(newPath, data);
    if (sluggedPath == "") {
      sluggedPath = "/";
    }

    if (newPath.startsWith("__drafts__")) {
      // Skip drafts for page index
      continue;
    }
    const lastPart = newPath.split("/").pop();

    if (lastPart == null) continue;
    const name = lastPart.split(".")[0];

    const title = data.title ?? name;
    permalinkIndex[sluggedPath] = { contentFile: newPath, title };

    const pathWithoutExt = newPath.split(".")[0];

    pageIndex[pathWithoutExt] = [sluggedPath];
    if (lastPart && pageIndex[name] == null) {
      pageIndex[name] = [sluggedPath];
    }
  }
  return [pageIndex, permalinkIndex];
}

export function slugifyPath(path: string, frontmatter: any) {
  // Generate a tokenized slug from a markdown file path using GitHub's style,
  // overridden by the permalink if provided in metadata

  const pathTokens = path.split("/");
  const fileName = pathTokens.pop();
  const fileBase = fileName?.split(".")[0] || "";
  const defaultSlug = slugify(fileBase, { lowercase: true });

  const { permalink, slug } = frontmatter;

  const fileSlug = permalink ?? slug ?? defaultSlug;

  let tokens = pathTokens.map((token) => slugify(token));

  if (fileSlug != "" && fileSlug != "index") {
    tokens.push(fileSlug);
  }

  // Join the path tokens back together
  let urlPath = tokens.join("/");
  if (urlPath == "") {
    urlPath = "/";
  }
  return urlPath;
}
