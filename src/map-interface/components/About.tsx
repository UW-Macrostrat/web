import React from "react";
import hyper from "@macrostrat/hyper";
import { NavLink, useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import styles from "./about.module.styl";
import newGithubIssueUrl from "new-github-issue-url";
import { AnchorButton } from "@blueprintjs/core";

const h = hyper.styled(styles);

const SoftwareInfo = (props) => {
  return h("div.software-info", [
    h("p.version", [
      `Version ${JSON.parse(process.env.NPM_VERSION)} `,
      h("span.revision", [
        "(revision ",
        h(
          "a",
          { href: JSON.parse(process.env.GITHUB_REV_LINK) },
          JSON.parse(process.env.GIT_COMMIT_HASH)
        ),
        ")  — ",
        JSON.parse(process.env.COMPILE_DATE),
      ]),
    ]),
    h("p.changes", [
      h(
        Link,
        {
          to: "/changelog",
        },
        "Changelog"
      ),
      h(LinkButton, {
        to: "/experiments",
        icon: "clean",
        className: "experimental-settings-button",
        minimal: true,
        small: true,
      }),
    ]),
  ]);
};

const LinkButton = ({to, ...props}) => {
  const navigate = useNavigate();
  return h(AnchorButton,  {...props, onClick() {
    navigate(to)
  }});
}

const AboutText = (props) => {
  const issueURL = newGithubIssueUrl({
    repo: "web",
    user: "UW-Macrostrat",
    title: "Found an issue with the Macrostrat web interface",
    body: "Please describe the issue you've found. Feel free to include screenshots or other information.",
  })

  return (
    <div className="about bp3-text text-panel">
      <div className={styles["title-block"]}>
        <h2>Macrostrat geologic map</h2>
        <SoftwareInfo />
      </div>

      <p>
        Macrostrat's geologic map system integrates over 290 bedrock geologic
        maps from around the world into a single, multiscale
        database. As you zoom in and out of this map interface, the display
        shifts between four harmonized levels of detail. Clicking on the map
        reveals primary data from the map and other regional information.
      </p>
      <ul className={styles["nav-list"]}>
        <li><LinkButton to="/sources" icon="map" minimal>Explore map sources</LinkButton></li>
        <li><LinkButton to="/usage" icon="help" minimal>Tips and tricks</LinkButton></li>
        <li><AnchorButton href={issueURL} target="_blank" icon="issue" minimal>Report a software bug</AnchorButton></li>
      </ul>

      <h3>Credits</h3>
      <ul>
        <li>
          Basemap&nbsp;
          <a
            className="ref-link"
            href="https://www.mapbox.com/about/maps/"
            target="_blank"
          >
            © Mapbox
          </a>
          &nbsp;
          <a
            className="ref-link"
            href="http://www.openstreetmap.org/about/"
            target="_blank"
          >
            © OpenStreetMap
          </a>
        </li>
        <li>
          Satellite map{" "}
          <a
            className="ref-link"
            href="https://www.mapbox.com/about/maps/"
            target="_blank"
          >
            © Mapbox
          </a>{" "}
          <a
            className="ref-link"
            href="http://www.openstreetmap.org/about/"
            target="_blank"
          >
            © OpenStreetMap
          </a>{" "}
          <a
            className="ref-link"
            href="https://www.digitalglobe.com/"
            target="_blank"
          >
            © DigitalGlobe
          </a>
        </li>
        <li>Elevation data from SRTM1 and ETOPO1</li>
        <li>
          Place search results © 2017 Mapbox and its suppliers. All rights
          reserved.
        </li>
        <li>
          Geologic map data adapted from{" "}
          <NavLink className="ref-link" to="/sources">
            various providers
          </NavLink>{" "}
          as noted.
        </li>
      </ul>

      <h3>Development team</h3>

      <ul>
        <li>
          <a className="ref-link" href="https://davenquinn.com" target="_blank">
            Daven P Quinn
          </a>
          , research scientist and <em>v4</em> lead developer
        </li>
        <li>
          <a
            className="ref-link"
            href="https://idzikowski-casey.github.io/Idzikowski-Casey/"
            target="_blank"
          >
            Casey Idzikowski
          </a>
          , research specialist and <em>v4</em> developer
        </li>
        <li>
          <a
            className="ref-link"
            href="http://strata.geology.wisc.edu"
            target="_blank"
          >
            Shanan Peters
          </a>
          , Macrostrat lab P.I. and data system architect
        </li>
        <li>
          <a className="ref-link" href="http://johnjcz.com" target="_blank">
            John J Czaplewski
          </a>
          , initial lead developer
        </li>
        <li>
          Puneet Kishor, initial earth-base and literature search development.
        </li>
      </ul>

      <p>
        Funding for core Macrostrat development via NSF EAR-1150082,
        Macrostrat—geologic map integration via NSF ICER-1440312, and literature
        integration via NSF ICER-1343760.
      </p>
    </div>
  );
};

export default AboutText;
