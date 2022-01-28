import React from "react";
import hyper from "@macrostrat/hyper";
import { NavLink } from "react-router-dom";
import Changelog from "../../changelog.mdx";
import { useAppActions } from "../app-state";
import { useLocation } from "react-router";
import styles from "./about.module.styl";

const h = hyper.styled(styles);

function ChangelogPanel() {
  return h("div.bp3-text", [h(Changelog)]);
}

function MapLink({ to = "", children }) {
  const loc = useLocation();
  return h(NavLink, { to: "/map" + to + loc.hash }, children);
}

const SoftwareInfo = (props) => {
  const runAction = useAppActions();
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
        "a",
        {
          onClick() {
            runAction({
              type: "push-panel",
              panel: {
                renderPanel: ChangelogPanel,
                title: "Changelog",
              },
            });
          },
        },
        "Changelog"
      ),
    ]),
  ]);
};

const AboutText = (props) => {
  const runAction = useAppActions();

  return (
    <div className="about">
      <div className={styles["title-block"]}>
        <h2>Macrostrat Geologic Map</h2>
        <SoftwareInfo />
      </div>

      <p>
        Macrostrat's geologic map is a seamless integration of over 200 geologic
        maps from around the world and at numerous scales that have been
        homogenized into a single database. As you zoom in and out of the map,
        scale-appropriate geologic maps are shown, and clicking on the map
        reveals primary data about each unit.
      </p>
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
            href="https://idzikowski-casey.github.io/personal-site/"
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
