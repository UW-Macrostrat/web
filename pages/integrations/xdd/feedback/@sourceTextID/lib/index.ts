import hyper from "@macrostrat/hyper";
import FeedbackWrap from "./feedback";
import styles from "./feedback.module.sass";

const h = hyper.styled(styles);

export interface FeedbackComponentProps {
  // Add props here
}

export function FeedbackComponent({ data }) {
  console.log(data);

  return h(
    "div.feedback-component",
    h(FeedbackWrap, { data: makeDataConform(data) })
  );
}

function makeDataConform(data) {
  return {
    text: {
      ...data,
    },
    strats: mergeIdenticalEntities(data.entities.map(makeEntityConform)),
  };
}

function makeEntityConform(entity) {
  return {
    ...entity,
    term_type: entity.type.name,
    txt_range: [entity.indices],
    children: entity.children?.map(makeEntityConform),
  };
}

function mergeIdenticalEntities(entities) {
  const entityMap = new Map();

  for (const entity of entities) {
    const key = entity.name;
    if (entityMap.has(key)) {
      console.log(entityMap.get(key));
      entityMap.get(key).txt_range.push(entity.indices[0]);
    } else {
      entityMap.set(key, entity);
    }
  }

  return Array.from(entityMap.values());
}

const data1 = {
  text: {
    preprocessor_id: "example_preprocessor_id",
    paper_id: "example_paper_id",
    hashed_text: "example_hashed_text",
    weaviate_id: "example_weaviate_id",
    extraction_pipeline_id: "0",
    model_id: "meta-llama/Meta-Llama-3-8B-Instruct_PROMPT_0",
    paragraph_text:
      "the mount galen volcanics consists of basalt, andesite, dacite, and rhyolite lavas and dacite and rhyolite tuff and tuff breccia. The Hayhook formation was named, mapped and discussed by lasky and webber 1949. the formation ranges up to at least 2500 feet in thickness.",
  },
  strats: [
    {
      term_type: "strat_name",
      txt_range: [[4, 25]],
      children: [
        {
          term_type: "lith",
          txt_range: [[38, 44]],
        },
        {
          term_type: "lith",
          txt_range: [[46, 54]],
        },
        {
          term_type: "lith",
          txt_range: [[56, 62]],
        },
        {
          term_type: "lith",
          txt_range: [[87, 93]],
        },
        {
          term_type: "lith",
          txt_range: [[107, 111]],
          children: [
            {
              term_type: "att_amod",
              txt_range: [[98, 106]],
            },
          ],
        },
        {
          term_type: "lith",
          txt_range: [[116, 120]],
        },
        {
          term_type: "lith",
          txt_range: [[121, 128]],
        },
        {
          term_type: "lith_NOUN",
          txt_range: [[77, 82]],
          children: [
            {
              term_type: "att_amod",
              txt_range: [[68, 76]],
            },
          ],
        },
      ],
    },
    {
      term_type: "strat_name",
      txt_range: [
        [130, 151],
        [210, 223],
      ],
    },
  ],
};

export { FeedbackWrap };
