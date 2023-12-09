import newGithubIssueUrl from "new-github-issue-url";
import h from "@macrostrat/hyper";

function PageIssueLink({ pageName = "map" }) {
  const href = newGithubIssueUrl({
    user: "UW-Macrostrat",
    repo: "web",
    title: `Issue with "${pageName}" page`,
  });

  return h("p", [
    "Found an issue with this application? ",
    h("a", { target: "_blank", href }, "Create an issue"),
  ]);
}

const RevisionInfo = () =>
  h("p.version", [
    `${JSON.parse(process.env.NPM_VERSION)} – ${JSON.parse(
      process.env.COMPILE_DATE
    )}`,
    " (",
    h(
      "a",
      { href: JSON.parse(process.env.GITHUB_REV_LINK) },
      JSON.parse(process.env.GIT_COMMIT_HASH)
    ),
    ")",
  ]);

export { PageIssueLink, RevisionInfo };
