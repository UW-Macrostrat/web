import * as blueprintIcons from "@blueprintjs/icons";

/** The parts of a `@blueprintjs/icons` module instance the loader needs. */
export type BlueprintIconsModule = Pick<
  typeof blueprintIcons,
  "Icons" | "IconNames" | "IconSize"
>;

const loading = new WeakMap<object, Promise<void>>();

/** Register every Blueprint icon in one `@blueprintjs/icons` module instance.
 *
 * Blueprint's `Icon` renders SVG paths synchronously only when they are already
 * registered; otherwise it renders an empty `bp6-icon` span and loads the paths
 * asynchronously. That leaves server-rendered HTML without icons and makes them
 * pop in after hydration. Loading all paths up front (server and client, before
 * rendering) makes both render passes complete and identical.
 *
 * The registry is module state, so it must be filled in the *same copy* of the
 * package that `@blueprintjs/core` imports. The server hook passes the copy it
 * resolves from core's own location for that reason.
 *
 * `Icons.loadAll()` is not used because (as of @blueprintjs/icons 6.13) it does
 * not await the work it starts.
 */
export function loadAllIconsInto(mod: BlueprintIconsModule): Promise<void> {
  const { Icons, IconNames, IconSize } = mod;
  let promise = loading.get(Icons);
  if (promise == null) {
    Icons.setLoaderOptions({ loader: "all" });
    const allIcons = Object.values(IconNames);
    promise = Promise.all([
      Icons.load(allIcons, IconSize.STANDARD),
      Icons.load(allIcons, IconSize.LARGE),
    ]).then(() => undefined);
    loading.set(Icons, promise);
  }
  return promise;
}

/** Load all icons into the copy of `@blueprintjs/icons` this module imports. */
export function loadAllBlueprintIcons(): Promise<void> {
  return loadAllIconsInto(blueprintIcons);
}
