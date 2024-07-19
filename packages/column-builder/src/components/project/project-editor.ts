import { hyperStyled } from "@macrostrat/hyper";
import { Project, TimeScale } from "../../types";
import { FormGroup, InputGroup, Spinner, TextArea } from "@blueprintjs/core";
import {
  ModelEditor,
  useModelEditor,
  ModelEditButton,
  ModelEditorContext,
} from "@macrostrat/ui-components";
import styles from "../comp.module.scss";
import pg, { usePostgrest } from "../..";
import { CancelButton, SubmitButton } from "~/components";
import { ItemSuggest } from "../suggest";

const h = hyperStyled(styles);

interface TimeScaleSuggest {
  value: string;
  data: TimeScale;
}

interface TimeScaleSuggestProps {
  onChange: (e: TimeScaleSuggest) => void;
  initialSelected?: number;
  onQueryChange?: (e: string) => void;
  timescales: TimeScale[];
}

function TimeScaleSuggest(props: TimeScaleSuggestProps) {
  const timescales_ = props.timescales.map((t) => {
    return { value: t.timescale, data: t };
  });

  const init = timescales_.filter((t) => t.data.id == props.initialSelected)[0];

  return h(ItemSuggest, {
    items: timescales_,
    initialSelected: init,
    onChange: props.onChange,
    onQueryChange: props.onQueryChange,
  });
}

function ProjectEdit() {
  const {
    model,
    actions,
  }: {
    model: Project;
    actions: any;
  } = useModelEditor();

  const timescales: TimeScale[] = usePostgrest(pg.from("timescales"));

  const defaultProjectName =
    model.project.length > 2 ? model.project : undefined;
  const defaultProjectDescrip =
    model.descrip.length > 2 ? model.descrip : undefined;

  const updateProject = (field: string, e: any) => {
    actions.updateState({ model: { [field]: { $set: e } } });
  };

  return h("div", [
    h(
      FormGroup,
      {
        helperText: "Add a name to your project",
        label: "Project Name",
        labelInfo: "(required)",
      },
      [
        h(InputGroup, {
          style: { width: "200px" },
          defaultValue: defaultProjectName,
          onChange: (e) => updateProject("project", e.target.value),
        }),
      ]
    ),
    h(
      FormGroup,
      {
        helperText: "Add a description to your project",
        label: "Project Description",
        labelInfo: "(recommended)",
      },
      [
        h(TextArea, {
          style: { minHeight: "170px", minWidth: "500px" },
          defaultValue: defaultProjectDescrip,
          onChange: (e) => updateProject("descrip", e.target.value),
        }),
      ]
    ),
    h(
      FormGroup,
      {
        helperText: "Most projects use International Ages",
        label: "Project Timescale",
        labelInfo: "(required)",
      },
      [
        h.if(timescales == undefined)(Spinner),
        h.if(timescales != undefined)(TimeScaleSuggest, {
          initialSelected: model.timescale_id,
          timescales,
          onChange: (e: TimeScaleSuggest) =>
            updateProject("timescale_id", e.data.id),
        }),
      ]
    ),
    h(SubmitButton),
  ]);
}

interface ProjectEditorProps {
  project: Project | {};
  persistChanges: (e: Partial<Project>, c: Partial<Project>) => Project;
}

function ProjectEditor(props: ProjectEditorProps) {
  return h(
    ModelEditor,
    {
      model: props.project,
      //@ts-ignore
      persistChanges: props.persistChanges,
      canEdit: true,
      isEditing: true,
    },
    [h(ProjectEdit)]
  );
}

export { ProjectEditor };
