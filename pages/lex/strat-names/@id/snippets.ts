import { XDDSnippet } from "~/types";
import { gddDomain } from "@macrostrat-web/settings";
import axios from "axios";
const basev1 = `${gddDomain}/api/v1`;

export async function getXDDSnippets(
  stratNames: string[]
): Promise<XDDSnippet[]> {
  let url = `${basev1}/snippets`;

  const res = await axios.get(url, {
    params: {
      article_limit: 20,
      term: stratNames.join(","),
    },
    responseType: "json",
  });
  try {
    return res.data.success.data;
  } catch (error) {
    return [];
  }
}
