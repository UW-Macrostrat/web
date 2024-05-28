import { Component, useContext } from "react";
import { IntervalEditor } from "./editor";
import {
  SVG,
  ColumnAxis,
  ColumnProvider,
  ColumnContext,
  GrainsizeAxis,
  FaciesProvider,
  AssetPathContext,
  GrainsizeLayoutProvider,
  GeologicPatternProvider,
  SymbolColumn,
  DivisionEditOverlay,
  ColumnImage,
  LithologyColumn,
  LithologyBoxes,
  GeneralizedSectionColumn,
  CoveredOverlay,
  FaciesColumnInner,
  NotesColumn
} from "@macrostrat/column-components";
import h from "~/hyper";
import T from "prop-types";
import defaultFacies from "./default-facies";
import { NoteEditor } from "./note-editor";
import patterns from "url:../../../../geologic-patterns/*.png";
import assetPaths from "url:../../sed-patterns/*.svg";
import { animateScroll as scroll } from "react-scroll";

const ColumnSVG = function(props) {
  const { width: innerWidth, margin, children, ...rest } = props;
  const { pixelHeight } = useContext(ColumnContext);
  const { left, right, top, bottom } = margin;
  const height = pixelHeight + (top + bottom);
  const width = innerWidth + (left + right);
  return h(
    SVG,
    {
      width,
      height,
      className: "section",
      ...rest
    },
    h(
      "g.backdrop",
      {
        transform: `translate(${left},${top})`
      },
      children
    )
  );
};

const MainColumn = function({ generalized, lithologyWidth: width, ...rest }) {
  if (generalized) {
    return h(GeneralizedSectionColumn, rest);
  }
  return h(LithologyColumn, { width, ...rest });
};

class StratColumn extends Component {
  constructor(...args) {
    super(...args);
    this.shouldShowNotes = this.shouldShowNotes.bind(this);
  }

  static initClass() {
    this.defaultProps = {
      margin: {
        left: 30,
        top: 30,
        right: 10,
        bottom: 30
      },
      showFacies: false,
      hideDefaultColumn: false,
      columnImage: null
    };
    this.propTypes = {
      inEditMode: T.bool.isRequired,
      generalized: T.bool,
      editingInterval: T.object,
      surfaces: T.arrayOf(T.object).isRequired,
      notes: T.arrayOf(T.object).isRequired,
      editInterval: T.func.isRequired,
      addInterval: T.func.isRequired,
      height: T.number.isRequired,
      hideDetailColumn: T.bool,
      onUpdateNote: T.func.isRequired,
      onDeleteNote: T.func.isRequired,
      columnImage: T.string
    };
  }

  shouldShowNotes() {
    return this.props.editingInterval == null && !this.props.hideDetailColumn;
  }

  //componentDidMount: =>
  //{margin} = @props
  //scroll.scrollTo(margin.top)

  render() {
    let {
      margin,
      clickedHeight,
      showFacies,
      notes,
      inEditMode,
      generalized,
      editingInterval,
      height,
      addInterval,
      removeInterval,
      editInterval,
      onUpdate,
      columnImage
    } = this.props;

    const lithologyWidth = 40;
    const columnWidth = 212;
    const grainsizeScaleStart = 132;
    const notesWidth = 480;
    const notesMargin = 30;
    const editorMargin = 30;
    const notesOffset = columnWidth + notesMargin;
    let containerWidth = columnWidth;

    if (this.props.hideDetailColumn) {
      editingInterval = null;
    }

    if (this.shouldShowNotes()) {
      containerWidth = notesOffset + notesWidth;
    }

    return h(
      ColumnProvider,
      {
        divisions: this.props.surfaces,
        range: [0, height],
        pixelsPerMeter: 20
      },
      [
        h("div.column-container", [
          h(
            GrainsizeLayoutProvider,
            {
              width: columnWidth,
              grainsizeScaleStart
            },
            [
              h.if(!generalized && columnImage)(ColumnImage, {
                left: this.props.margin.left + lithologyWidth,
                top: this.props.margin.top,
                src: columnImage
              }),
              h.if(inEditMode)(DivisionEditOverlay, {
                top: this.props.margin.top,
                left: this.props.margin.left,
                width: 200,
                onClick: this.props.editInterval,
                color: "dodgerblue",
                editingInterval
              }),
              h(
                ColumnSVG,
                {
                  width: containerWidth,
                  margin,
                  style: { zIndex: 10, position: "relative" }
                },
                [
                  h(MainColumn, { generalized, lithologyWidth }, [
                    h.if(showFacies)(FaciesColumnInner),
                    h(CoveredOverlay),
                    h(LithologyBoxes)
                  ]),
                  h(SymbolColumn, { left: 90, symbols: [] }),
                  h(ColumnAxis),
                  h(GrainsizeAxis),
                  // Notes column
                  h.if(this.shouldShowNotes())(NotesColumn, {
                    notes,
                    transform: `translate(${notesOffset})`,
                    width: notesWidth,
                    onUpdateNote: this.props.onUpdateNote,
                    onDeleteNote: this.props.onDeleteNote,
                    noteEditor: NoteEditor,
                    allowPositionEditing: true
                  })
                ]
              )
            ]
          )
        ]),
        h.if(this.props.editingInterval)(IntervalEditor, {
          interval: editingInterval,
          height: clickedHeight,
          closeDialog: () => {
            return editInterval(null);
          },
          addInterval,
          removeInterval,
          setEditingInterval: editInterval,
          onUpdate
        })
      ]
    );
  }
}
StratColumn.initClass();

const resolvePattern = id => {
  return patterns[id];
};

const __StratOuter = function(props) {
  return h(
    GeologicPatternProvider,
    { resolvePattern },
    h(FaciesProvider, { initialFacies: defaultFacies }, [h(StratColumn, props)])
  );
};

export { __StratOuter as StratColumn };
