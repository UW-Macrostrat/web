import { Tag, TagProps, Icon, InputGroup } from "@blueprintjs/core";
import { ChangeEvent, ComponentType, HTMLAttributes, ReactNode, useCallback, useState } from "react";

import { ingestPrefix } from "@macrostrat-web/settings";
import hyper from "@macrostrat/hyper";
import styles from "./add-button.module.sass";

const h = hyper.styled(styles);

const addNewTag = async (tag: string, ingestId: number) => {
  const response = await fetch(
    `${ingestPrefix}/ingest-process/${ingestId}/tags`,
    {
      method: "POST",
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({tag: tag})
    }
  )
  if(!response.ok){
    console.log("error", response)
  }
}

const Button = ({onClick}: {onClick: () => void}) => {
  return h("div", {
    onClick: onClick
  }, [
    h(Icon, {icon: "add", size: 15, style: {marginRight: "6px"}}, []),
    "Add Tag"
  ])
}

const Input = (
  {ingestId, onChange} : {ingestId: number, onChange: () => Promise<void>}
) => {

  const handleKeyDown = useCallback(async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if(e.key === "Enter") {
      await addNewTag(e.currentTarget.value, ingestId)
      await onChange()
      e.currentTarget.value = ""
    }
  }, [])

  return h(InputGroup, {
    id: "tag-input",
    placeholder: "Add Tag",
    style: {
      backgroundColor: "inherit",
      boxShadow: "box-shadow: 0 0 0 0 rgb(255 255 255 / 0%), 0 0 0 0 rgb(255 255 255 / 0%), inset 0 0 0 1px rgb(255 255 255 / 20%), inset 0 1px 1px rgb(255 255 255 / 50%)",
      height: "1.2rem",
      padding: 0
    },
    autoFocus: true,
    onKeyDown: handleKeyDown,
  }, [])
}

interface AddTagButtonProps extends TagProps {
  ingestId: number;
  onChange: () => Promise<void>;
}

const AddTagButton = ({ingestId, onChange, ...props} : AddTagButtonProps) => {

  const [toggled, setToggled] = useState<boolean>(false);

  return h(Tag, {
    style: {
      backgroundColor: "rgb(228,228,228)",
      color: "black"
    },
    ...props
  }, [
    h.if(!toggled)([
      h(Button, {
        onClick: () => setToggled(!toggled)
      })
    ]),
    h.if(toggled)([
      h(Input, {
        ingestId: ingestId,
        onChange: async () => {
          await onChange()
          setToggled(!toggled)
        }
      }, [])
    ])
  ])
}

export default AddTagButton;
