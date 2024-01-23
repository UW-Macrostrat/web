import React from "react";

// Helper class
class TableTemplate extends React.Component {
  render() {
    return (
      <table>
        <tbody>
          <tr>{this.props.data}</tr>
        </tbody>
      </table>
    );
  }
}

class ChartLegend extends React.Component {
  render() {
    var tables = [];
    var row = [];

    this.props.data.forEach((d, i) => {
      if (i % 3 === 0 && i !== 0) {
        tables.push(<TableTemplate data={row} />);
        row = [];
      }

      row.push(
        <td
          className="legend-square"
          style={{ backgroundColor: d.color }}
          key={i}
        >
          {d.label}
        </td>
      );
    });

    // Put the last row in a table
    tables.push(<TableTemplate data={row} />);

    return <div>{tables}</div>;
  }
}

export default ChartLegend;
