import React from "react";

const AboutText = (props) => {
  return (
    <div className="about">
      <h2>Macrostrat Geologic Map</h2>
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
          <a
            className="ref-link"
            href="https://macrostrat.org/api/v2/defs/sources?all"
            target="_blank"
          >
            various providers
          </a>{" "}
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
