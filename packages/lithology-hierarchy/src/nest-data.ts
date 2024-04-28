export interface Lith {
  lith_id: number;
  name: string;
  type: string | null;
  group: string | null;
  class: string | null;
  color: string;
  fill?: number;
}

export interface TreeNode {
  name: string;
  lith?: Lith;
  isExpanded?: boolean;
  children?: TreeNode[];
}

interface TreeNodeMap {
  name: string;
  lith?: Lith;
  children?: Map<string, TreeNodeMap>;
}

export function nestLiths(liths: Lith[]): TreeNode {
  const root: TreeNodeMap = { name: "Rocks", children: new Map() };
  // Ensure that empty strings are treated as null
  for (let lith of liths) {
    for (const key of ["type", "group", "class"]) {
      if (lith[key] === "") lith[key] = null;
    }
  }

  for (let lith of liths) {
    if (lith.class == null || lith.type == null)
      console.error(lith, "Class and type should never be null");
    if (lith.class == null) console.log(lith.name, "Class is null");
    if (lith.type == null) console.log(lith.name, "Type is null");

    // Create a class if it doesn't exist
    if (lith.class != null) {
      if (!root.children.has(lith.class)) {
        root.children.set(lith.class, {
          name: lith.class,
          children: new Map<string, TreeNodeMap>(),
        });
      }
    } else {
      if (!root.children.has(lith.name)) {
        root.children.set(lith.name, { name: lith.name });
      }
    }

    // Add the type to the class
    if (lith.class != null && lith.type != null) {
      const parent = root.children.get(lith.class);
      if (!parent.children.has(lith.type)) {
        parent.children.set(lith.type, {
          name: lith.type,
          children: new Map<string, TreeNodeMap>(),
        });
      }
    }

    // Add the group to the type
    if (lith.class != null && lith.type != null) {
      if (lith.group != null) {
        const parent = root.children.get(lith.class);
        const grandparent = parent.children.get(lith.type);
        if (!grandparent.children.has(lith.group)) {
          grandparent.children.set(lith.group, {
            name: lith.group,
            children: new Map<string, TreeNodeMap>(),
          });
        }
      } else {
        const parent = root.children.get(lith.class);
        const grandparent = parent.children.get(lith.type);
        if (!grandparent.children.has(lith.name)) {
          grandparent.children.set(lith.name, { name: lith.name });
        }
      }
    }

    // Add the lithology to the group
    if (
      lith.class != null &&
      lith.type != null &&
      lith.group != null &&
      lith.name != null
    ) {
      const parent = root.children.get(lith.class);
      const grandparent = parent.children.get(lith.type);
      const greatgrandparent = grandparent.children.get(lith.group);
      greatgrandparent.children.set(lith.name, {
        name: lith.name,
        lith,
        children: new Map<string, TreeNodeMap>(),
      });
    }
  }

  // Export to TreeNode format
  return convert(root);
}

function convert(data: TreeNodeMap): TreeNode {
  if (data.children == null) {
    return { name: data.name, lith: data.lith };
  }
  return {
    name: data.name,
    lith: data.lith,
    children: Array.from(data.children.values()).map(convert),
  };
}
