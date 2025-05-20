import h from "@macrostrat/hyper";
import { ColumnNavigationMap } from "@macrostrat/column-views";
import { mapboxAccessToken } from "@macrostrat-web/settings";
import { ErrorBoundary } from "@macrostrat/ui-components";
import { useState, useEffect } from "react";
import { SETTINGS } from "@macrostrat-web/settings";

export function ColumnMap({
  projectID,
  inProcess,
  className,
  selectedColumn,
  onSelectColumn,
}) {
  // Define state for data and loading
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    console.log("DATA", data)
  useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(SETTINGS.apiV2Prefix + "/columns?int_id=1&response=long&format=geojson");
                const result = await response.json();

                if (result.success) {
                    setData(result.success.data);  // Assume this is the correct data
                    setLoading(false);
                } else {
                    setError("Failed to load data");
                    setLoading(false);
                }
            } catch (error) {
                setError("Error fetching data");
                setLoading(false);
            }
        };

        fetchData();
    }, []);  // Empty dependency array means this effect runs only once after the first render

    if (loading) {
        return h("div", "Loading...");  // Show loading state
    }

    if (error) {
        return h("div", error);  // Show error state
    }

  return h(ColumnNavigationMap, {
      className,
      inProcess,
      projectID,
      accessToken: mapboxAccessToken,
      selectedColumn,
      onSelectColumn,
      columns: data.features,
    })
}
