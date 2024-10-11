import type { EntityType } from "../../extractions/lib/types";

type Match = any;

export interface Entity {
  id: number;
  name: string;
  type?: number;
  indices: [number, number];
  children: Entity[];
  match?: Match;
}

export { EntityType };

export type Highlight = {
  start: number;
  end: number;
  tag?: string;
  text?: string;
  backgroundColor?: string;
  borderColor?: string;
  id: number;
};

export interface EntityExt extends Omit<Entity, "type" | "children"> {
  type: EntityType;
  children: EntityExt[];
}
