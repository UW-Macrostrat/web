import h from "@macrostrat/hyper";
import { UnitsColumn } from "@macrostrat/column-views";
import UnitNamesColumn from "./unit-names";

const CompositeUnitsColumn = (props: ICompositeUnitProps) => {
  /*
  A column with units and names either
  overlapping or offset to the right
  */
  const { columnWidth, width, gutterWidth, labelOffset } = props;

  return h([
    h(UnitsColumn, {
      width: columnWidth,
    }),
    h(UnitNamesColumn, {
      transform: `translate(${columnWidth + gutterWidth})`,
      paddingLeft: labelOffset,
      width: width - columnWidth - gutterWidth,
    }),
  ]);
};

CompositeUnitsColumn.defaultProps = {
  gutterWidth: 10,
  labelOffset: 30,
};

export { CompositeUnitsColumn };
export * from "./provider";
