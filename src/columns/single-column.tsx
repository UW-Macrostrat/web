import { Component } from "react";
import h from "react-hyperscript";
import { nest } from "d3-collection";
import { sum } from "d3-array";
import { Popover } from "@blueprintjs/core";

const groupUnits = function(sectionUnits) {
  /*
   * Split units in gap-bound packages into nested
   * unit groups
   */
  const __ = [];
  const lastUnit = null;
  const group = {};
  for (let unit of Array.from(sectionUnits)) {
    // We have a group defined
    const { Gp, Fm, Mbr, unit_name } = unit;
    //if unit.Gp?

    //if lastUnit?
    //  #if unit.Gp == lastUnit.Gp
    __.push(unit);
  }
  return __;
};

class ColumnContainer extends Component {
  constructor(props) {
    super(props);
    this.sectionSurfaces = this.sectionSurfaces.bind(this);
  }

  static initClass() {
    this.defaultProps = {
      minUnitHeight: 20,
      maxUnitHeight: 100
    };
  }
  sectionSurfaces(section) {
    /*
     * Computes surface heights for a gap-bound package
     */
    const { maxUnitHeight, minUnitHeight } = this.props;
    const units = section.units.map(function(unit) {
      const { min_thick, max_thick } = unit;
      let thickness = max_thick;
      if (thickness < minUnitHeight) {
        thickness = minUnitHeight;
      }
      if (thickness > maxUnitHeight) {
        thickness = maxUnitHeight;
      }
      return { ...unit, thickness };
    });

    const totalThickness = sum(units, d => d.thickness);

    let bottom = totalThickness;

    // Add tops and bottoms to units, then group
    // formations and members
    return groupUnits(
      units.map(function(unit) {
        const top = bottom;
        bottom = top - unit.thickness;
        return { top, bottom, ...unit };
      })
    );
  }

  render() {
    let { units } = this.props;

    // Separate column into gap-bound sections
    // which should be treated mostly separately
    const sections = nest()
      .key(d => d.section_id)
      .entries(units)
      .map(function(d) {
        // Rename entries semantically
        let section_id;
        ({ key: section_id, values: units } = d);
        section_id = parseInt(section_id);
        return { section_id, units };
      });

    const surfaces = sections.map(this.sectionSurfaces);

    return h(
      "div.column",
      surfaces.map(section =>
        h(
          "div.section",
          section.map(function(unit) {
            let { thickness, color, unit_name, Mbr, Fm, Gp } = unit;
            if (color == null) {
              color = "#eee";
            }
            const style = {
              minHeight: thickness,
              backgroundColor: color
            };

            return h(Popover, [
              h("div.unit", { style }, [
                h("p", unit_name),
                h("p", `Mbr: ${Mbr}`),
                h("p", `Fm: ${Fm}`),
                h("p", `Gp: ${Gp}`)
              ]),
              h("div.unit-details", null, [
                h("pre", JSON.stringify(unit, null, 2))
              ])
            ]);
          })
        )
      )
    );
  }
}
ColumnContainer.initClass();

export { ColumnContainer };
