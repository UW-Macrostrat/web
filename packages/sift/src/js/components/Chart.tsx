import React from "react";
import Chart from "chart.js";

class MacroChart extends React.Component {
  constructor(props) {
    super(props);
    this._update = this._update.bind(this);

    //console.log("got props");
    this.state = {
      data: this.props.data,
    };
    //console.log(this.props.data);
  }

  _update(data) {
    if (this.doughnutChart) {
      this.doughnutChart.destroy();
    }

    var ctx = document.getElementById(this.props.id).getContext("2d");
    this.doughnutChart = new Chart(ctx).Doughnut(data, this.props.options);

    if (this.props.returnLegend) {
      this.props.shareLegend(
        this.props.id,
        this.doughnutChart.generateLegend()
      );
    }
  }

  componentDidMount() {
    this._update(this.state.data);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.data != this.props.data) {
      this._update(nextProps.data);
    }
  }

  render() {
    return (
      <div className="chart-canvas-container">
        <div className="chart-label-master">
          <div className="chart-label">
            <div className="chart-label-container">
              <p>{this.props.title}</p>
            </div>
          </div>
        </div>
        <div className="chart-canvas-wrapper">
          <canvas id={this.props.id}></canvas>
        </div>
      </div>
    );
  }
}

MacroChart.defaultProps = {
  options: {
    responsive: true,
    mintainAspectRatio: false,
    tooltipTemplate: `<%if (label){%><%=label%>: <%}%><%= parseInt(value*100) + '%' %>`,
    legendTemplate: `<ul class=\"doughnut-legend\">
                      <% for (var i=0; i<segments.length; i++) { %>
                        <li>
                          <span style=\"background-color:<%=segments[i].fillColor%>\"></span>
                          <% if (segments[i].label) { %> <%=segments[i].label%> <% } %>
                        </li>
                      <% } %>
                      </ul>`,
  },
};

export default MacroChart;
