import { Link } from "~/renderer/Link";
import { Counter } from "./Counter";

export { Page };

function Page() {
  return (
    <>
      <h1>Welcome</h1>
      This page is:
      <ul>
        <li>Rendered to HTML.</li>
        <li>
          Interactive. <Counter />
        </li>
        <li>
          <Link href="map">Map</Link>
        </li>
        <li>
          <Link href="maps">Map index</Link>
        </li>
        <li>
          <Link href="globe">Globe</Link>
        </li>
      </ul>
    </>
  );
}
