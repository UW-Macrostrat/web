type Match = any;

export interface Entity {
  id: number;
  name: string;
  type?: number;
  indices: [number, number];
  children: Entity[];
  match?: Match;
}

export interface EntityType {
  name: string;
  color: string;
  id: number;
}

export type Highlight = {
  start: number;
  end: number;
  tag?: string;
  text?: string;
  backgroundColor?: string;
  borderColor?: string;
};

export interface EntityExt extends Omit<Entity, "type" | "children"> {
  type: EntityType;
  children: EntityExt[];
}
