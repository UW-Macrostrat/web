import h from "@macrostrat/hyper";
import { useEffect, useState } from "react";

export function Page() {
  const siftUrls = [
    "Intervals",
    "/definitions/intervals",
    "/interval/57",
    "/interval/10",
    "/interval/5",
    "/interval/213",
    "/interval/843",
    "/interval/402",

    "Strat Names (Individual Pages dont work)",
    "/definitions/strat_names",
    "/strat_name/57",
    "/strat_name/101",
    "/strat_name/5",
    "/strat_name/513",
    "/strat_name/1430",
    "/strat_name/902",

    "Columns",
    "/definitions/columns",
    "/column/57",
    "/column/12",
    "/column/3",
    "/column/51",
    "/column/1410",
    "/column/202",

    "Strat Name Concepts",
    "/definitions/strat_name_concepts",
    "/strat_name_concept/57",
    "/strat_name_concept/101",
    "/strat_name_concept/5",
    "/strat_name_concept/513",
    "/strat_name_concept/1430",
    "/strat_name_concept/902",

    "Groups",
    "/definitions/groups",
    "/group/1",
    "/group/2",
    "/group/3",
    "/group/4",

    "Lithologies",
    "/definitions/lithologies",
    "/lithologies/17",
    "/lithologies/101",
    "/lithologies/9",
    "/lithologies/513",
    "/lithologies/140",
    "/lithologies/902",

    "Environments",
    "/definitions/environments",
    "/environment/17",
    "/environment/1",
    "/environment/9",
    "/environment/13",

    "Economics",
    "/definitions/economics",
    "/economic/17",
    "/economic/1",
    "/economic/9",
    "/economic/13",
  ];

  const locUrls = [
    "/",
    "/-3/2/",
    "/1/1/column",
    "/2/3/column#z=10&show=columns,geology",
    "/-107.7083/38.5802#x=-107.8909&y=38.7058&z=8.73km&a=132&e=76&show=satellite,geology",
    "/-112.1976/36.0962#strat_name_concepts=11016&x=-112.236&y=36.2119&z=15.61km&a=165&e=42",
  ];

  const allUrls = [
    ...locUrls.map((url) => ({ path: "/map/loc" + url, type: "loc" })),
    ...siftUrls.flatMap((url) =>
      url.startsWith("/")
        ? [
            { path: "/sift#" + url, type: "sift" },
            { path: "/sift/#" + url, type: "sift" },
            { path: "/sift" + url, type: "sift" },
          ]
        : [{ path: null, label: url }]
    ),
  ];

  const [statusMap, setStatusMap] = useState({});

  useEffect(() => {
    async function checkUrls() {
      const updates = {};
      for (const entry of allUrls) {
        if (!entry.path) continue;
        try {
          const response = await fetch(entry.path, {
            method: "HEAD",
            redirect: "follow",
          });
          setStatusMap((prev) => ({
            ...prev,
            [entry.path]: {
              ok: response.ok,
              redirected: response.redirected,
              finalUrl: response.url,
              status: response.status,
            },
          }));
        } catch (err) {
          setStatusMap((prev) => ({ ...prev, [entry.path]: { ok: false } }));
        }
      }
    }
    checkUrls();
  }, []);

  function renderUrlEntry(entry) {
    if (!entry.path) return h("h3", entry.label);

    const status = statusMap[entry.path];
    let statusColor = "yellow";

    if (status) {
      statusColor = status.ok ? "green" : "red";
    }

    return h("div.url-entry", [
      h("span.status", {
        style: {
          backgroundColor: statusColor,
          width: "1.5em",
          height: "1.5em",
          display: "inline-block",
          borderRadius: "10%",
          marginRight: "0.5em",
        },
      }),
      h("a", { href: entry.path }, entry.path),
      status?.finalUrl ? h("span.redirect", ` -> ${status.finalUrl}`) : null,
    ]);
  }

  return h(
    "div.url-list",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        margin: "1em 20%",
        gap: ".5em",
      },
    },
    [
      h("h1", "Loc URLs"),
      ...allUrls.slice(0, locUrls.length).map(renderUrlEntry),
      h("h1", "Sift URLs"),
      ...allUrls.slice(locUrls.length).map(renderUrlEntry),
    ]
  );
}
