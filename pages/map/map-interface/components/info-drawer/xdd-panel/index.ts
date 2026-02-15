import h from "@macrostrat/hyper";
import { xDDExpansionPanel, XDDSnippet } from "@macrostrat/data-components";
import { Suspense, useEffect } from "react";
import { atom, useAtomValue, useSetAtom } from "jotai";
import fetch from "cross-fetch";
import { gddDomain } from "@macrostrat-web/settings";

const xDDURLAtom = atom<URL>();

const xDDQueryResultAtom = atom(async (get) => {
  const url = get(xDDURLAtom);
  if (!url) return null;
  const res = await abortableFetch(url);
  console.log(res);
  return res.success.data;
});

export function XddExpansionContainer(props) {
  const { terms, article_limit = 20 } = props;
  const setURL = useSetAtom(xDDURLAtom);
  const data = useAtomValue(xDDQueryResultAtom);

  useEffect(() => {
    const url = new URL(`${gddDomain}/api/v1/snippets`);
    url.searchParams.set("term", terms.join(","));
    url.searchParams.set("article_limit", article_limit.toString());
    setURL(url);
  }, [terms, article_limit, setURL]);

  return h(
    Suspense,
    {
      fallback: h(xDDExpansionPanel, {
        data: null,
        isFetching: true,
        className: null,
      }),
    },
    h(xDDExpansionPanel, {
      data,
      className: null,
    })
  );
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
