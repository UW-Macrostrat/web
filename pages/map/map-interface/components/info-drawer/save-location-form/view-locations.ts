import { hyperStyled } from "@macrostrat/hyper";
import useBreadcrumbs from "use-react-router-breadcrumbs";
import { LinkButton } from "../../buttons";
import h from "@macrostrat/hyper";

function BackButton() {
  const breadcrumbs = useBreadcrumbs();
  const prevRoute = breadcrumbs[breadcrumbs.length - 2];
  const to = prevRoute?.match.pathname || "/";
  return h(LinkButton, { to, icon: "arrow-left", minimal: true, small: true });
}
//http request outside of page. page to only render the dynamic
function ViewLocations({ locations }) { // Destructure props to access locations
  return h("div.view-locations-container", [
    h(BackButton),
    ...locations.map((location) => // Spread the array to avoid nested arrays
      h("div.location-card", { key: location.id }, [
        h("h3.location-name", location.location_name),
        h("p.location-description", location.location_description),
        h("p.location-coordinates", [
          `Latitude: ${location.latitude}, Longitude: ${location.longitude}`,
        ]),
        h("p.location-category", `Category: ${location.category}`),
        h("p.location-dates", [
          `Created at: ${new Date(location.created_at).toLocaleString()}`,
          `Updated at: ${new Date(location.updated_at).toLocaleString()}`,
        ]),
      ])
    ),
  ]);
}

export { ViewLocations };
