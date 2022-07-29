import React from "react";

function AboutPanel() {
  return (
    <div className="about-container">
      <h2>BirdsEye</h2>
      <p>
        BirdsEye is an application that is aimed at editing GeoJSON polygons
        <b>
          {" "}
          <i>while</i>
        </b>{" "}
        keeping topology. Users can use the <b>Edit Topology</b> mode to create
        new column footprint geometries. The <b>Tessellate</b> mode can be used
        to create polygons inside a bounding geometry or quickly create polygons
        from points. The <b>View/ Edit Properties</b> mode to add column-group
        and column-name information. This application is being developed at{" "}
        <a href="https://macrostrat.org/" target="_blank">
          {" "}
          UW-Macrostrat
        </a>
        .
      </p>
      <p>
        This application is driven by frontend user interactions, a Python
        RestAPI, and a PostgreSQL database, which manages topology using{" "}
        <a
          href="https://github.com/davenquinn/postgis-geologic-map"
          target="_blank"
        >
          Postgis-Geologic-Map
        </a>
        .
      </p>
      <h2>How To Use</h2>
      <p>
        A user can create a new project by following the directions in the{" "}
        <i>Projects</i> tab. Once an empty project is created the user can begin
        adding geometries to the map by either using the <i>line-tool</i> or the{" "}
        <i>polygon-tool</i>. Both of which are availble on the <b>LEFT</b> side
        of the map when in <b>Edit Topology</b> mode.
      </p>
      <p>
        When using the <i>line-tool</i> make sure that each vertix of the line
        is connected to another vertix before you finish drawing (press{" "}
        <i>enter / return</i>). If there are any unconnected vertices, i.e
        unclosed lines, then the polygon will not be created on save.
      </p>
      <p>
        All vertices that meet or are grouped together, can be{" "}
        <i>
          <b>dragged</b>
        </i>{" "}
        together. To ungroup vertices, hold <b>shift</b> while you click on a
        vertix. This will bypass the multiple dragging mode.
      </p>
      <p>
        There is an option to create a new n-sided polygon (n {">="} 3 ) as a
        base for your geometric footprint. When in <i>Edit Topology</i> the
        second option from the top will place you in the <b>Polygon Drawing</b>{" "}
        mode. Click anywhere once and move your mouse. By default, a hexgon
        appears and dynamically changes sizes as you move your cursor from the
        original clicked point on the map.
      </p>
      <p>
        To increase the number of sides the polygon has, press the{" "}
        <i>
          <b>a</b>
        </i>{" "}
        key while the mode is active. Similarly, press the{" "}
        <i>
          <b>s</b>
        </i>
        key to subtract from the number of sides the polgyon has. To finish and
        create the polygon, press{" "}
        <i>
          <b>enter</b>
        </i>{" "}
        or to exit without creating press the{" "}
        <i>
          <b>esc</b>
        </i>{" "}
        key.
      </p>
      <p>
        If you find an bug report it{" "}
        <a href=" https://github.com/Idzikowski-Casey/column-topology/issues">
          here
        </a>
        !
      </p>
      <h3>Development Team</h3>
      <ul>
        <li className="dev-team">
          <a
            href="https://idzikowski-casey.github.io/personal-site/"
            target="_blank"
          >
            Casey Idzikowski
          </a>
          , Research Specialist and lead developer.
        </li>
        <li className="dev-team">
          <a href="https://davenquinn.com/" target="_blank">
            Daven Quinn
          </a>
          , Research scientist and Postgis-Geologic-Map developer
        </li>
      </ul>
      <div>
        <a href="https://github.com/Idzikowski-Casey/column-topology">Github</a>
        {" | "}
        <a href="https://github.com/davenquinn/postgis-geologic-map">
          Postgis-Geologic-Map
        </a>
      </div>
    </div>
  );
}

export { AboutPanel };
