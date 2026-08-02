export interface Lith {
  lith_id: number;
  name: string;
  type: string | null;
  group: string | null;
  class: string | null;
  color: string;
  fill?: number;
}

export interface TreeNodeData<T extends object> {
  name: string;
  data: T;
  isExpanded?: boolean;
  children?: TreeNodeData<T>[];
}

interface TreeNodeMap<T extends object> {
  name: string;
  data?: T;
  children?: Map<string, TreeNodeMap<T>>;
}

export function nestLiths(liths: Lith[]): TreeNodeData<Lith> {
  const root: TreeNodeMap<Lith> = { name: "Rocks", children: new Map() };
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
          data: lith,
          children: new Map<string, TreeNodeMap<Lith>>(),
        });
      }
    } else {
      if (!root.children.has(lith.name)) {
        root.children.set(lith.name, { name: lith.name, lith });
      }
    }

    // Add the type to the class
    if (lith.class != null && lith.type != null) {
      const parent = root.children.get(lith.class);
      if (!parent.children.has(lith.type)) {
        parent.children.set(lith.type, {
          name: lith.type,
          children: new Map<string, TreeNodeMap<Lith>>(),
          data: lith,
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
            children: new Map<string, TreeNodeMap<Lith>>(),
            data: lith,
          });
        }
      } else {
        const parent = root.children.get(lith.class);
        const grandparent = parent.children.get(lith.type);
        if (!grandparent.children.has(lith.name)) {
          grandparent.children.set(lith.name, { name: lith.name, data: lith });
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
        data: lith,
        children: new Map<string, TreeNodeMap<Lith>>(),
      });
    }
  }

  // Export to TreeNode format
  return convert(root);
}

function convert<T extends object>(data: TreeNodeMap<T>): TreeNodeData<T> {
  if (data.children == null) {
    return { name: data.name, data: data.data };
  }
  return {
    name: data.name,
    data: data.data,
    children: Array.from(data.children.values()).map(convert),
  };
}

function groupByType(items) {
  return items.reduce((acc, item) => {
    const type = item.type.toLowerCase();
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(item);
    return acc;
  }, {});
}

export interface LithAttribute {
  lith_att_id: number;
  t_units: string;
  name: string;
  type: string;
}

export function nestLithAttributes(
  lithAtts: LithAttribute[]
): TreeNodeData<LithAttribute> {
  const root: TreeNodeMap<LithAttribute> = {
    name: "Lith attributes",
    data: null,
    children: new Map(),
  };
  for (let att of lithAtts) {
    if (!root.children.has(att.type)) {
      root.children.set(att.type, {
        name: att.type,
        children: new Map<string, TreeNodeMap<LithAttribute>>(),
      });
    }
    const parent = root.children.get(att.type);
    parent.children.set(att.name, {
      name: att.name,
      data: att,
    });
  }
  return convert(root);
}

export function nestItems(liths: Lith[]): TreeNodeData<Lith> {
  const root: TreeNodeMap<Lith> = { name: "Rocks", children: new Map() };
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
          data: lith,
          children: new Map<string, TreeNodeMap<Lith>>(),
        });
      }
    } else {
      if (!root.children.has(lith.name)) {
        root.children.set(lith.name, { name: lith.name, data: lith });
      }
    }

    // Add the type to the class
    if (lith.class != null && lith.type != null) {
      const parent = root.children.get(lith.class);
      if (!parent.children.has(lith.type)) {
        parent.children.set(lith.type, {
          name: lith.type,
          children: new Map<string, TreeNodeMap<Lith>>(),
          data: lith,
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
            data: lith,
            children: new Map<string, TreeNodeMap<Lith>>(),
          });
        }
      } else {
        const parent = root.children.get(lith.class);
        const grandparent = parent.children.get(lith.type);
        if (!grandparent.children.has(lith.name)) {
          grandparent.children.set(lith.name, { name: lith.name, data: lith });
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
        data: lith,
        children: new Map<string, TreeNodeMap<Lith>>(),
      });
    }
  }

  // Export to TreeNode format
  return convert(root);
}
