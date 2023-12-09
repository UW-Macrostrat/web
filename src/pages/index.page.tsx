import { Link } from "~/renderer/Link";

export function Page() {
  return (
    <>
      <h1>Macrostrat dev</h1>
      <ul>
        <li>
          <Link href="map">Map</Link>
        </li>
        <li>
          <Link href="maps">Map index</Link>
        </li>
        <li>
          <Link href="dev">Dev layers</Link>
        </li>
      </ul>
    </>
  );
}
