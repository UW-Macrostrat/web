import React from "react";
import StratColumnUnit from "./StratColumnUnit";
import Utilities from "./Utilities";
import _ from "underscore";

class StratColumn extends React.Component {
  constructor(props) {
    super(props);
    this._update = this._update.bind(this);
    this.state = {
      periods: [
        {
          sections: [
            {
              id: 0,
              units: [
                {
                  unit_id: 0,
                  text_color: "",
                  unit_name: "",
                  rgba: {
                    r: 0,
                    g: 0,
                    b: 0,
                    alpha: 0,
                  },
                },
              ],
            },
          ],
        },
      ],
    };
  }
  _update(data) {
    var column = [
      {
        name: "Quaternary",
        abbrev: "Q",
        color: "#F9F97F",
        t_age: 0,
        b_age: 2.588,
        sections: [],
      },
      {
        name: "Neogene",
        abbrev: "Ng",
        color: "#FFE619",
        t_age: 2.588,
        b_age: 23.03,
        sections: [],
      },
      {
        name: "Paleogene",
        abbrev: "Pg",
        color: "#FD9A52",
        t_age: 23.03,
        b_age: 66,
        sections: [],
      },
      {
        name: "Cretaceous",
        abbrev: "K",
        color: "#7FC64E",
        t_age: 66,
        b_age: 145,
        sections: [],
      },
      {
        name: "Jurassic",
        abbrev: "J",
        color: "#34B2C9",
        t_age: 145,
        b_age: 201.3,
        sections: [],
      },
      {
        name: "Triassic",
        abbrev: "Tr",
        color: "#812b92",
        t_age: 201.3,
        b_age: 252.17,
        sections: [],
      },
      {
        name: "Permian",
        abbrev: "P",
        color: "#F04028",
        t_age: 252.17,
        b_age: 298.9,
        sections: [],
      },
      {
        name: "Carboniferous",
        abbrev: "C",
        color: "#67A599",
        t_age: 298.9,
        b_age: 358.9,
        sections: [],
      },
      {
        name: "Devonian",
        abbrev: "D",
        color: "#CB8C37",
        t_age: 358.9,
        b_age: 419.2,
        sections: [],
      },
      {
        name: "Silurian",
        abbrev: "S",
        color: "#B3E1B6",
        t_age: 419.2,
        b_age: 443.8,
        sections: [],
      },
      {
        name: "Ordovician",
        abbrev: "O",
        color: "#009270",
        t_age: 443.8,
        b_age: 485.4,
        sections: [],
      },
      {
        name: "Cambrian",
        abbrev: "Cm",
        color: "#7FA056",
        t_age: 485.4,
        b_age: 541,
        sections: [],
      },
      {
        name: "PreCambrian",
        abbrev: "PCm",
        color: "#F04370",
        t_age: 541,
        b_age: 4000,
        sections: [],
      },
    ];

    // For each unit...
    for (var i = 0; i < data.length; i++) {
      // Get the rgb value of the hex color
      data[i].rgba = Utilities.hexToRgb(data[i].color.replace("#", ""), 0.7);
    }

    var sections = _.groupBy(data, "section_id");

    // Sort units in section by t_age
    Object.keys(sections).forEach(function (section_id) {
      sections[section_id] = sections[section_id].sort(function (a, b) {
        return a.t_age - b.tage;
      });
    });

    var mappedSections = [];
    Object.keys(sections).forEach(function (section_id) {
      mappedSections.push({
        id: sections[section_id][0].section_id,
        t_age: _.min(sections[section_id], function (d) {
          return d.t_age;
        }).t_age,
        b_age: _.max(sections[section_id], function (d) {
          return d.b_age;
        }).b_age,
        units: sections[section_id].sort(function (a, b) {
          return a.t_age - b.tage;
        }),
      });
    });

    // For each section...
    for (var i = 0; i < mappedSections.length; i++) {
      // Find the right time bin
      var found = false;
      for (var j = 0; j < column.length; j++) {
        // Check if the unit's age is contained in the time interval
        if (
          mappedSections[i].t_age >= column[j].t_age &&
          mappedSections[i].b_age <= column[j].b_age
        ) {
          found = true;
          column[j].sections.push(mappedSections[i]);
          break;
        }
      }
      // If it doesn't entirely slide into a time interval, put it in the interval that it's top age belongs to
      if (!found) {
        for (var j = 0; j < column.length; j++) {
          // Check if the unit's age is contained in the time interval
          if (
            mappedSections[i].b_age >= column[j].t_age &&
            mappedSections[i].b_age <= column[j].b_age
          ) {
            found = true;
            column[j].sections.push(mappedSections[i]);
            break;
          }
        }
      }
    }

    // Sort the sections in each time bin
    for (var i = 0; i < column.length; i++) {
      column[i].sections = column[i].sections.sort(function (a, b) {
        return a.t_age - b.t_age;
      });
    }

    var newColumn = Object.keys(column).map((d) => {
      return column[d];
    });
    newColumn.forEach(function (d) {
      d.sections = Object.keys(d.sections).map((j) => {
        return d.sections[j];
      });
    });
    newColumn = newColumn.filter((d) => {
      if (d.sections.length > 0) {
        return d;
      }
    });

    // Make sure the units are sorted!
    for (var i = 0; i < newColumn.length; i++) {
      for (var j = 0; j < newColumn[i].sections.length; j++) {
        newColumn[i].sections[j].units = newColumn[i].sections[j].units.sort(
          function (a, b) {
            return a.t_age - b.tage;
          }
        );
      }
    }
    this.setState({ periods: newColumn });
  }

  componentDidMount() {
    this._update(this.props.data);
  }

  componentWillReceiveProps(nextProps) {
    this._update(nextProps.data);
  }

  componentDidUpdate() {
    // Make sure the time periods are sized properly and text is placed
    var periods = document.querySelectorAll(".period-names");
    for (var i = 0; i < periods.length; i++) {
      periods[i].style.height = periods[i].nextSibling.clientHeight + "px";
      periods[i].style["line-height"] =
        periods[i].nextSibling.clientHeight + "px";
    }
  }

  render() {
    if (this.state.periods.length > 1) {
      return (
        <div className="strat-column">
          <div className="strat-column-warning">
            <p>
              <i>
                Note: some columns have complex unit relationships that are not
                expressed below
              </i>
            </p>
          </div>
          {this.state.periods.map((period, period_idx) => {
            return (
              <div className="row" key={period_idx}>
                <div
                  className="col-xs-1 col-xs-offset-2 period-names column-div"
                  style={{ backgroundColor: period.color }}
                >
                  <div className="period-name">{period.abbrev}</div>
                </div>

                <div className="col-xs-8 col-xs-offset-2 column-div section-container">
                  {period.sections.map((section, section_idx) => {
                    return (
                      <div className="section-box" key={section_idx}>
                        {section.units.map((unit, unit_idx) => {
                          return <StratColumnUnit data={unit} key={unit_idx} />;
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      );
    } else {
      return <div></div>;
    }
  }
}

export default StratColumn;
