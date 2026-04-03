import h from "@macrostrat/hyper";
import { xDDExpansionPanel, XDDSnippet } from "@macrostrat/data-components";
import { Suspense, useEffect } from "react";
import { atom, useAtomValue, useSetAtom } from "jotai";
import fetch from "cross-fetch";
import { gddDomain } from "@macrostrat-web/settings";
import { loadable } from "jotai/utils";

const xDDURLAtom = atom<URL>();

const xDDQueryAtom = atom(async (get, { signal }) => {
  const url = get(xDDURLAtom);
  if (!url) return null;
  const res = await fetch(url, { signal });
  const responseData = await res.json();
  return responseData.success.data;
});

const xDDQueryResultAtom = loadable(xDDQueryAtom);

export function XddExpansionContainer(props) {
  const { terms, article_limit = 20 } = props;
  const setURL = useSetAtom(xDDURLAtom);
  const res = useAtomValue(xDDQueryResultAtom);

  useEffect(() => {
    const url = new URL(`${gddDomain}/api/v2/snippets`);
    url.searchParams.set("term", terms.join(","));
    url.searchParams.set("article_limit", article_limit.toString());
    setURL(url);
  }, [terms, article_limit, setURL]);

  return h(xDDExpansionPanel, {
    data: res?.data ?? null,
    isFetching: res.state === "loading",
    className: null,
  });
}

async function abortableFetch(url: URL | string) {
  // Create an AbortController for this request
  const controller = new AbortController();
  const signal = controller.signal;

  // Schedule abortion if the atom re-evaluates (dependency change)
  // Note: Jotai cleans up async atoms automatically when they are no longer used

  try {
    const response = await fetch(url, { signal });
    return await response.json();
  } catch (error) {
    if (error.name === "AbortError") {
      console.log(`Request to ${url} was aborted.`);
    }
    throw error;
  }
}
