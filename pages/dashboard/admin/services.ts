/** The build each main service is running, from its `version` route. */
import hyper from "@macrostrat/hyper";
import { HTMLTable, Spinner, Tag } from "@blueprintjs/core";
import {
  apiV2Prefix,
  apiV3Prefix,
  tileserverDomain,
} from "@macrostrat-web/settings";
import { type ReactNode, useEffect, useState } from "react";
import { formatDateTime } from "./api";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

interface ServiceSpec {
  name: string;
  url: string;
  repository: string;
  changelog: string;
  tagPrefix: string;
}

interface BuildInfo {
  service: string;
  version: string | null;
  release: boolean;
  commit: string | null;
  build_date: string | null;
  repository: string | null;
}

const services: ServiceSpec[] = [
  {
    name: "Website",
    url: "/_version",
    repository: "UW-Macrostrat/web",
    changelog: "docs/changelog.md",
    tagPrefix: "v",
  },
  {
    name: "API v2",
    url: `${apiV2Prefix}/version`,
    repository: "UW-Macrostrat/macrostrat-api",
    changelog: "CHANGELOG.md",
    tagPrefix: "v",
  },
  {
    name: "API v3",
    url: `${apiV3Prefix}/version`,
    repository: "UW-Macrostrat/macrostrat",
    changelog: "services/api-v3/CHANGELOG.md",
    tagPrefix: "api-v3-v",
  },
  {
    name: "Tileserver",
    url: `${tileserverDomain}/version`,
    repository: "UW-Macrostrat/macrostrat",
    changelog: "services/tileserver/CHANGELOG.md",
    tagPrefix: "tileserver-v",
  },
  {
    name: "Legacy tileserver",
    url: `${tileserverDomain}/legacy/version`,
    repository: "UW-Macrostrat/macrostrat",
    changelog: "services/legacy-tileserver/CHANGELOG.md",
    tagPrefix: "legacy-tileserver-v",
  },
];

export function ServicesPanel() {
  return h(HTMLTable, { className: "services-table", compact: true }, [
    h("thead", [
      h("tr", [
        h("th", "Service"),
        h("th", "Version"),
        h("th", "Built"),
        h("th", "Commit"),
        h("th", "Changelog"),
      ]),
    ]),
    h(
      "tbody",
      services.map((spec) => h(ServiceRow, { key: spec.name, spec }))
    ),
  ]);
}

function ServiceRow({ spec }: { spec: ServiceSpec }) {
  const { info, loading, error } = useBuildInfo(spec.url);

  let cells: ReactNode;
  if (loading) {
    cells = h("td", { colSpan: 4 }, h(Spinner, { size: 16 }));
  } else if (error != null) {
    cells = h("td.muted", { colSpan: 4 }, `Not reporting (${error})`);
  } else {
    cells = h(BuildCells, { spec, info });
  }

  return h("tr", [h("td", spec.name), cells]);
}

function BuildCells({ spec, info }: { spec: ServiceSpec; info: BuildInfo }) {
  const repository = info.repository ?? spec.repository;
  const github = `https://github.com/${repository}`;
  const ref = info.commit ?? "main";

  let commit: ReactNode = h("span.muted", "local build");
  if (info.commit != null) {
    commit = h(
      "a",
      { href: `${github}/commit/${info.commit}` },
      h("code", info.commit.slice(0, 7))
    );
  }

  return h([
    h("td", h(VersionLabel, { spec, info, github })),
    h("td", formatDateTime(info.build_date)),
    h("td", commit),
    h("td", h("a", { href: `${github}/blob/${ref}/${spec.changelog}` }, "View")),
  ]);
}

function VersionLabel({ spec, info, github }) {
  if (info.version == null) return h("span.muted", "unknown");
  if (!info.release) {
    return h("span.version", [
      info.version,
      h(Tag, { minimal: true }, "unreleased build"),
    ]);
  }
  const tag = spec.tagPrefix + info.version;
  return h("a", { href: `${github}/tree/${tag}` }, info.version);
}

function useBuildInfo(url: string) {
  const [info, setInfo] = useState<BuildInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(url, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return res.json();
      })
      .then((body) => {
        if (cancelled) return;
        setInfo(body);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message ?? "Request failed");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return { info, loading, error };
}
