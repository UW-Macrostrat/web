import { hyperStyled } from "@macrostrat/hyper";
import { BasePage, UnitEditor, UnitEditorModel } from "../../../src";
import { persistNewUnitChanges } from "./new-helpers";
import { GetServerSideProps } from "next";
import styles from "../units.module.scss";
const h = hyperStyled(styles);

function NewUnit({
  col_id,
  section_id,
}: {
  col_id: string;
  section_id: string;
}) {
  const model = { unit: { col_id: parseInt(col_id) }, liths: [], envs: [] };

  const persistChanges = async (
    updatedModel: UnitEditorModel,
    changeSet: Partial<UnitEditorModel>
  ) => {
    return await persistNewUnitChanges(
      updatedModel,
      changeSet,
      section_id,
      parseInt(col_id)
    );
  };

  return h(
    BasePage,
    { query: { col_id: parseInt(col_id), section_id: parseInt(section_id) } },
    [
      //@ts-ignore
      h(UnitEditor, { model, persistChanges }),
    ]
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  return {
    props: { section_id: ctx.query.section_id, col_id: ctx.query.col_id },
  };
};

export default NewUnit;
