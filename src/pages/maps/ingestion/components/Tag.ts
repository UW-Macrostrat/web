
import { Tag as BlueprintTag, TagProps as BlueprintTagProps } from "@blueprintjs/core"
import { ComponentType, HTMLAttributes, ReactNode } from "react";

import { ingestPrefix } from "@macrostrat-web/settings";
import hyper from "@macrostrat/hyper";
import styles from "./tag.module.sass";

const h = hyper.styled(styles);

function hashCode(str: string) { // java String#hashCode
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hash;
}

function intToRGB(i: number){
  let c = (i & 0x00FFFFFF)
    .toString(16)
    .toUpperCase();

  return "#0000000".substring(0, 7 - c.length) + c;
}

const deleteTag = async (tag: string, ingestId: number) => {

  const response = await fetch(
    `${ingestPrefix}/ingest-process/${ingestId}/tags/${tag}`,
    {
      method: "DELETE",
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    }
  )

  if(response.ok){
    return
  } else {
    console.log("error", response)
  }

}

interface TagProps extends BlueprintTagProps {
  value: string;
  ingestId: number;
  color?: string;
  onChange: () => Promise<void>;
}

const Tag = ({value, ingestId, color, onChange, ...props} : TagProps) => {

  color = color ? color : intToRGB(hashCode(value));

  return h(
    BlueprintTag,
    {
      onClick: async () => {
        await deleteTag(value, ingestId)
        await onChange()
      },
      style: { backgroundColor: color, marginTop: "auto", marginBottom: "auto" }, ...props
    }, [
      value
    ])
}

export default Tag;
export type { TagProps };
