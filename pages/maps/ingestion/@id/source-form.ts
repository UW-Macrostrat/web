import { InputGroup, FormGroup, Button } from "@blueprintjs/core";

import { ingestPrefix } from "@macrostrat-web/settings";

// Styling
import hyper from "@macrostrat/hyper";
import styles from "./source-form.module.sass";
import { ReactNode, useCallback, useEffect, useState, useRef } from "react";
import {
  ProgressPopover,
  ProgressPopoverProps,
} from "#/maps/ingestion/@id/components";
export const h = hyper.styled(styles);

const INPUT_FIELDS = {
  Name: "name",
  URL: "url",
  "Reference Title": "ref_title",
  Authors: "authors",
  "Reference Year": "ref_year",
  "ISBN DOI": "isbn_doi",
  Scale: "scale",
  Licence: "licence",
  Area: "area",
  "Raster URL": "raster_url",
};

const postSource = async (data: any) => {
  const response = await fetch(`${ingestPrefix}/sources`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (response.ok) {
    return response.json();
  }

  throw new Error("Failed to post source");
};

const postIngestProcess = async (data: any) => {
  const response = await fetch(`${ingestPrefix}/ingest-process`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (response.ok) {
    return response.json();
  }

  throw new Error("Failed to post ingest process");
};

const postIngestProcessObject = async (
  ingestProcessId: number,
  files: FileList
) => {
  if (files.length == 0) {
    return;
  }

  const data = new FormData();
  Array.from<File>(files).forEach((file) => {
    data.append("object", file, file.name);
  });

  const response = await fetch(
    `${ingestPrefix}/ingest-process/${ingestProcessId}/objects`,
    {
      method: "POST",
      body: data,
    }
  );

  if (response.ok) {
    return response.json();
  }

  throw new Error("Failed to add objects");
};

const StringInput = ({
  label,
  name,
  value,
}: {
  label: string;
  name: string;
  value?: string;
}) => {
  return h(
    FormGroup,
    {
      label: label,
      labelFor: name,
    },
    [
      h(
        InputGroup,
        {
          id: name,
          name: name,
          defaultValue: value,
        },
        []
      ),
    ]
  );
};

const SourceForm = ({
  onSubmit,
  source,
  children,
}: {
  onSubmit: (e) => void;
  source?: Source;
  children?: ReactNode;
}) => {
  return h(
    "form",
    {
      onSubmit: onSubmit,
    },
    [
      Object.entries(INPUT_FIELDS).map(([label, name]) => {
        return h(StringInput, {
          label: label,
          name: name,
          value: source?.[name],
        });
      }),
      children,
      h(Button, { type: "submit" }, "Submit"),
    ]
  );
};

const AddSourceForm = () => {
  const [progress, setProgress] = useState<ProgressPopoverProps | undefined>(
    undefined
  );
  const fileInput = useRef<HTMLInputElement>(null);

  const onSubmit = useCallback(
    async (e) => {
      // Prevent the form from submitting
      e.stopPropagation();
      e.preventDefault();

      // Convert the form into a json of key value pairs
      const formData = new FormData(e.target as HTMLFormElement);
      const data: { [p: string]: any } = Object.fromEntries(formData.entries());

      // If the value is a empty string remove the key
      Object.keys(data).forEach((key) => {
        if (data[key] == "") {
          delete data[key];
        }
      });

      // Add the files to the form data
      const files = fileInput.current.files;
      delete data["object"];

      // Submit the data
      setProgress({ text: "Creating Source", value: 0 });
      const source = await postSource(data);

      setProgress({ text: "Creating Ingest Process", value: 0.33 });
      const ingestProcess = await postIngestProcess({
        source_id: source.source_id,
        state: "pending",
      });

      setProgress({ text: "Uploading Files", value: 0.66 });
      const ingestProcessObject = await postIngestProcessObject(
        ingestProcess.id,
        files
      );

      setProgress({ text: "Done", value: 1 });
      setTimeout(() => {
        setProgress(undefined);
      }, 1000);
    },
    [fileInput]
  );

  return h("div", {}, [
    h(SourceForm, { onSubmit: onSubmit }, [
      h(FormGroup, { label: "Source Files" }, [
        h(InputGroup, {
          inputRef: fileInput,
          type: "file",
          multiple: true,
          name: "object",
          id: "file",
        }),
      ]),
    ]),
    h.if(progress != undefined)(ProgressPopover, { ...progress }, []),
  ]);
};

const EditSourceForm = ({ sourceId }: { sourceId: number }) => {
  const [source, setSource] = useState<Source>();

  const getSource = async () => {
    const response = await fetch(`${ingestPrefix}/sources/${sourceId}`);
    if (response.ok) {
      const data = await response.json();
      setSource(data);
    } else {
      console.error(response);
    }
  };

  useEffect(() => {
    getSource();
  }, []);

  const onSubmit = useCallback(
    async (e) => {
      // Prevent the form from submitting
      e.stopPropagation();
      e.preventDefault();

      // Convert the form into a json of key value pairs
      const formData = new FormData(e.target as HTMLFormElement);
      const data = Object.fromEntries(formData.entries());

      // Filter out data that is the same as the source
      const filteredData = Object.entries(data).filter(([key, value]) => {
        // Pass if the value is different from source, but consider null and empty string as the same
        return (
          value !== source?.[key] && !(value == "" && source?.[key] == null)
        );
      });

      // Convert array of key value pairs into an object
      const filteredDataObject = Object.fromEntries(filteredData);

      // If empty, do not submit
      if (Object.keys(filteredDataObject).length == 0) {
        return;
      }

      // Submit the data
      const response = await fetch(`${ingestPrefix}/sources/${sourceId}`, {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(filteredDataObject),
      });

      if (response.ok) {
        getSource();
      } else {
        console.error(response);
      }
    },
    [getSource, sourceId]
  );

  return h(SourceForm, { onSubmit: onSubmit, source: source });
};

export { EditSourceForm, AddSourceForm, SourceForm };
