/*
 * decaffeinate suggestions:
 * DS002: Fix invalid constructor
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import {
    Button
} from "@blueprintjs/core";
import { DeleteButton } from "@macrostrat/ui-components";
import { format } from "d3-format";
import T from "prop-types";
import { Component } from "react";

import { ColumnContext } from "@macrostrat/column-components";

import {
    BoundaryStyleControl,
    FaciesPicker, LithologyPicker,
    LithologySymbolPicker, PickerControl, SurfaceOrderSlider, grainSizes
} from "@macrostrat/column-components";

import h from "~/hyper";
import { Panel } from "../ui";

const fmt = format(".1f");

const surfaceTypes = [
  { value: "mfs", label: "Maximum flooding surface" },
  { value: "sb", label: "Sequence boundary" }
];

class IntervalEditor extends Component {
  static initClass() {
    this.defaultProps = { onUpdate() {} };
    this.propTypes = {
      setEditingInterval: T.func.isRequired,
      onUpdate: T.func.isRequired
    };
    this.contextType = ColumnContext;
  }
  constructor(props) {
    this.updateFacies = this.updateFacies.bind(this);
    this.update = this.update.bind(this);
    super(props);
    this.state = {
      facies: [],
      isAlertOpen: false
    };
  }
  render() {
    const { interval, height, section, style } = this.props;
    const { divisions } = this.context;
    if (interval == null) {
      return null;
    }
    const ix = divisions.indexOf(interval);

    const { id, top, bottom, facies } = interval;
    const hgt = fmt(height);
    const txt = `interval starting at ${hgt} m`;
    return h(
      Panel,
      {
        style,
        className: "interval-editor",
        title: h([
          "Edit interval ",
          h("span.height-range", `${bottom} - ${top} m`)
        ]),
        onClose: () => {
          return this.props.setEditingInterval(null);
        }
      },
      [
        h("div.buttons", [
          h(
            Button,
            {
              onClick: () => {
                const division = divisions[ix - 1];
                return this.props.setEditingInterval({ division });
              },
              disabled: ix === 0
            },
            "Previous"
          ),
          h(
            Button,
            {
              onClick: () => {
                const division = divisions[ix + 1];
                return this.props.setEditingInterval({ division });
              },
              disabled: ix === divisions.length - 1
            },
            "Next"
          )
        ]),
        h("label.bp5-label", [
          "Lithology",
          h(LithologyPicker, {
            interval,
            onChange: lithology => this.update({ lithology })
          })
        ]),
        h("label.bp5-label", [
          "Lithology symbol",
          h(LithologySymbolPicker, {
            interval,
            onChange: d => this.update({ fillPattern: d })
          })
        ]),
        h("label.bp5-label", [
          "Grainsize",
          h(PickerControl, {
            vertical: false,
            isNullable: true,
            states: grainSizes.map(d => ({
              label: d,
              value: d
            })),
            activeState: interval.grainsize,
            onUpdate: grainsize => {
              return this.update({ grainsize });
            }
          })
        ]),
        h("label.bp5-label", [
          "Surface expression",
          h(BoundaryStyleControl, {
            interval,
            onUpdate: d => this.update({ definite_boundary: d })
          })
        ]),
        h("label.bp5-label", [
          "Facies",
          h(FaciesPicker, {
            onClick: this.updateFacies,
            interval,
            onChange: facies => this.update({ facies })
          })
        ]),
        h("label.bp5-label", [
          "Surface type (parasequence)",
          h(PickerControl, {
            vertical: false,
            isNullable: true,
            states: surfaceTypes,
            activeState: interval.surface_type,
            onUpdate: surface_type => {
              return this.update({ surface_type });
            }
          })
        ]),
        h("label.bp5-label", [
          "Surface order",
          h(SurfaceOrderSlider, {
            interval,
            onChange: this.update
          })
        ]),
        h("div.buttons", [
          h(
            DeleteButton,
            {
              itemDescription: "the " + txt,
              handleDelete: () => {
                if (this.props.removeInterval == null) {
                  return;
                }
                return this.props.removeInterval(id);
              }
            },
            "Delete this interval"
          ),
          h(
            Button,
            {
              onClick: () => {
                if (this.props.addInterval == null) {
                  return;
                }
                return this.props.addInterval(height);
              }
            },
            `Add interval starting at ${fmt(height)} m`
          )
        ])
      ]
    );
  }

  updateFacies(facies) {
    const { interval } = this.props;
    let selected = facies.id;
    if (selected === interval.facies) {
      selected = null;
    }
    return this.update({ facies: selected });
  }

  update(newData) {
    const { interval } = this.props;
    return this.props.onUpdate(interval, newData);
  }
}
IntervalEditor.initClass();

export { IntervalEditor };
