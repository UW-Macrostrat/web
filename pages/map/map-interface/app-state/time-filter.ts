import { atom } from "jotai";
import type {
  TimeFilterAtom,
  TimeFilterParams,
} from "~/components/time-filter";
import { appActionsAtom, appStateAtom } from "./store";

/** The map's interval filter, read and written in the shared time-filter
 * vocabulary. */
export const mapTimeFilterAtom: TimeFilterAtom = atom(
  (get): TimeFilterParams | null => {
    const filter = get(appStateAtom).filters.find((d) => d.type == "intervals");
    if (filter == null) return null;
    return { int_id: Number(filter.id) };
  },
  (get, _set, value: TimeFilterParams | null) => {
    const runAction = get(appActionsAtom);
    // The map filters by single intervals only; other kinds are ignored.
    if (value == null) {
      runAction({ type: "set-interval-filter", int_id: null });
    } else if (value.int_id != null) {
      runAction({ type: "set-interval-filter", int_id: value.int_id });
    }
  }
);

const filterMapUnitsBaseAtom = atom(true);

/** The column's own filter while it is not driving the map */
const localColumnTimeFilterAtom = atom<TimeFilterParams | null>(null);

/** The sidebar column's time filter: the map's own when map units follow the
 * column, otherwise one the column keeps to itself. */
export const columnTimeFilterAtom: TimeFilterAtom = atom(
  (get) => {
    if (get(filterMapUnitsBaseAtom)) return get(mapTimeFilterAtom);
    return get(localColumnTimeFilterAtom);
  },
  (get, set, value: TimeFilterParams | null) => {
    if (get(filterMapUnitsBaseAtom)) {
      set(mapTimeFilterAtom, value);
    } else {
      set(localColumnTimeFilterAtom, value);
    }
  }
);

/** Whether the column's time filter also filters the map's units. Switching
 * hands the current filter across, so the column keeps its window. */
export const filterMapUnitsAtom = atom(
  (get) => get(filterMapUnitsBaseAtom),
  (get, set, linked: boolean) => {
    if (linked == get(filterMapUnitsBaseAtom)) return;
    if (linked) {
      const local = get(localColumnTimeFilterAtom);
      if (local != null) set(mapTimeFilterAtom, local);
    } else {
      set(localColumnTimeFilterAtom, get(mapTimeFilterAtom));
      set(mapTimeFilterAtom, null);
    }
    set(filterMapUnitsBaseAtom, linked);
  }
);
