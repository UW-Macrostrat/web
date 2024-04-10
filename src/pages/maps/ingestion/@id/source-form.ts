

import {InputGroup, FormGroup, Button} from "@blueprintjs/core";

import { ingestPrefix } from "@macrostrat-web/settings";

// Styling
import hyper from "@macrostrat/hyper";
import styles from "./source-form.module.sass";
import { useEffect, useState } from "react";
export const h = hyper.styled(styles);

const INPUT_FIELDS = {
  Name: "name",
  URL: "url",
  "Reference Title": "ref_title",
  "Authors": "authors",
  "Reference Year": "ref_year",
  "ISBN DOI": "isbn_dui",
  Scale: "scale",
  Licence: "licence",
  Area: "area",
  "Raster URL": "raster_url"
}

const StringInput = ({label, name, value}: {label: string, name: string, value?: string}) => {
  return h(FormGroup,
    {
      label: label,
      labelFor: name
    },
    [
      h(InputGroup,
        {
          id: name,
          name: name,
          defaultValue: value
        },
        []
      )
    ]
  )
}

const SourceForm = ({sourceId} : {sourceId: number}) => {

  const [source, setSource] = useState<Source>()

  const getSource = async () => {
    const response = await fetch(`${ingestPrefix}/sources/${sourceId}`)
    if(response.ok) {
      const data = await response.json()
      setSource(data)
    } else {
      console.error(response)
    }
  }

  useEffect(() => {
    getSource()
  }, [])

  return h("form",
    {
      onSubmit: async (e) => {

        // Prevent the form from submitting
        e.stopPropagation()
        e.preventDefault()

        // Convert the form into a json of key value pairs
        const formData = new FormData(e.target as HTMLFormElement)
        const data = Object.fromEntries(formData.entries())

        // Filter out data that is the same as the source
        const filteredData = Object.entries(data).filter(([key, value]) => {

          // Pass if the value is different from source, but consider null and empty string as the same
          return value !== source?.[key] && !(value == "" && source?.[key] == null)
        })

        // Convert array of key value pairs into an object
        const filteredDataObject = Object.fromEntries(filteredData)

        // If empty, do not submit
        if(Object.keys(filteredDataObject).length == 0) {
          return
        }

        // Submit the data
        const response = await fetch(`${ingestPrefix}/sources/${sourceId}`, {
          method: "PATCH",
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(filteredDataObject)
        })

        if(response.ok) {
          getSource()
        } else {
          console.error(response)
        }
      }
    },
    [
      Object.entries(INPUT_FIELDS).map(([label, name]) => {
        return h(StringInput, {label: label, name: name, value: source?.[name]})
      }),
      h(Button, {type: "submit"}, "Submit")
    ]
  )
}

export default SourceForm;