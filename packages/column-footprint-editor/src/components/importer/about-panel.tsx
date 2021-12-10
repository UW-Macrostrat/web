import { Divider } from "@blueprintjs/core";
import React from "react";

function AboutPanel() {
  return (
    <div>
      <h2>BirdsEye</h2>
      <p>
        BirdsEye is an application that is aimed at editing GeoJSON polygons
        <b>
          {" "}
          <i>while</i>
        </b>{" "}
        keeping topology. Users can use the <b>Edit Topology</b> mode to create
        new column footprint geometries and then use the{" "}
        <b>View/ Edit Properties</b> mode to add column-group and column-name
        information. This application is being developed at{" "}
        <a href="https://macrostrat.org/" target="_blank">
          {" "}
          UW-Macrostrat
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
        together. Sometimes this action works very well and sometimes it takes a
        couple tries to get them sticking together. The best workflow I've found
        is, dragging a vertix to another one to where they are overlapping. Then
        unclick the lines such that <b>NO</b> lines are highlighted. Then
        reclick the line and vertix to be dragged.
      </p>
      <p>
        If you find an bug report it{" "}
        <a href=" https://github.com/Idzikowski-Casey/column-topology/issues">
          here
        </a>
        !
      </p>
      <Divider />
      <div>
        <b>Lead Developer: </b>{" "}
        <a
          href="https://idzikowski-casey.github.io/personal-site/"
          target="_blank"
        >
          Casey Idzikowski
        </a>
        <div>
          <a href="https://github.com/Idzikowski-Casey/column-topology">
            Github
          </a>
        </div>
      </div>
    </div>
  );
}

export { AboutPanel };
