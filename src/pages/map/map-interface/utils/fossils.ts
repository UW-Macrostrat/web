export function makeOccurrenceTree(data) {
  let occurrenceTree = { phyla: [] };
  let rankMap = {
    25: "unranked",
    23: "kingdom",
    22: "subkingdom",
    21: "superphylum",
    20: "phylum",
    19: "subphylum",
    18: "superclass",
    17: "class",
    16: "subclass",
    15: "infraclass",
    14: "superorder",
    13: "order",
    12: "suborder",
    11: "infraorder",
    10: "superfamily",
    9: "family",
    8: "subfamily",
    7: "tribe",
    6: "subtribe",
    5: "genus",
    4: "subgenus",
    3: "species",
    2: "subspecies",
  };

  function getIndex(data, term, property) {
    for (let i = 0, len = data.length; i < len; i++) {
      if (data[i][property] === term) return i;
    }
    return -1;
  }

  data.forEach((d) => {
    // Some preprocessing
    d.rank = d.rnk ? rankMap[d.rnk] : d.idr ? rankMap[d.idr] : "Unknown";
    d.italics = d.rnk < 6 ? "italics" : "";
    if (typeof d.tna === "undefined") {
      d.tna = d.idn;
    }
    d.old_name = d.tna.split(" ")[0] != d.idg ? d.tna : "";
    d.url =
      d.rank === "species"
        ? d.idg + " " + d.ids
        : d.tid
        ? d.tid.split(":")[1] > 0
          ? d.idg
          : ""
        : "";

    // If it has a genus name...
    if (d.idg) {
      let genusRes = d.rsg ? d.rsg + " " : "";
      let speciesRes = d.rss ? " " + d.rss + " " : " ";
      d.genusRes = genusRes;
      // If it's a species...
      if (d.rank === "species") {
        d.display_name1 = d.tna;
        d.display_name2 = d.tna != d.idg + " " + d.ids ? "(" + d.tna + ")" : "";
        d.display_name3 = "";
      } else {
        d.display_name1 = d.idg;
        d.display_name2 = speciesRes;
        d.display_name3 = d.ids;
      }
    } else {
      d.display_name1 = d.tna;
      d.display_name2 = "";
    }

    // Find unique phyla
    let phyla = [];
    for (let i = 0; i < occurrenceTree.phyla.length; i++) {
      phyla.push(occurrenceTree.phyla[i].phylum);
    }

    if (phyla.indexOf(d.phl) < 0) {
      let newPhylum = { phylum: d.phl, classes: [] };
      occurrenceTree.phyla.push(newPhylum);
    }

    // Find unique phylum/class combinations
    let phyla_classes = [];
    for (let i = 0; i < occurrenceTree.phyla.length; i++) {
      for (let j = 0; j < occurrenceTree.phyla[i].classes.length; j++) {
        phyla_classes.push(
          occurrenceTree.phyla[i].phylum +
            "-" +
            occurrenceTree.phyla[i].classes[j].nameClass
        );
      }
    }

    if (phyla_classes.indexOf(d.phl + "-" + d.cll) < 0) {
      let newClass = { nameClass: d.cll, families: [] };
      let phylumIndex = getIndex(occurrenceTree.phyla, d.phl, "phylum");
      occurrenceTree.phyla[phylumIndex]["classes"].push(newClass);
    }

    // Find unique phylum/class/family combinations
    let phyla_class_family = [];
    for (let i = 0; i < occurrenceTree.phyla.length; i++) {
      for (let j = 0; j < occurrenceTree.phyla[i].classes.length; j++) {
        for (
          let k = 0;
          k < occurrenceTree.phyla[i].classes[j].families.length;
          k++
        ) {
          phyla_class_family.push(
            occurrenceTree.phyla[i].phylum +
              "-" +
              occurrenceTree.phyla[i].classes[j].nameClass +
              "-" +
              occurrenceTree.phyla[i].classes[j].families[k].family
          );
        }
      }
    }

    if (phyla_class_family.indexOf(d.phl + "-" + d.cll + "-" + d.fml) < 0) {
      let newFamily = { family: d.fml, genera: [] };
      let phylumIndex = getIndex(occurrenceTree.phyla, d.phl, "phylum");
      let classIndex = getIndex(
        occurrenceTree.phyla[phylumIndex].classes,
        d.cll,
        "nameClass"
      );
      occurrenceTree.phyla[phylumIndex].classes[classIndex]["families"].push(
        newFamily
      );
    }

    // Place genera into the right phylum/class/family
    let phylumIndex = getIndex(occurrenceTree.phyla, d.phl, "phylum");
    let classIndex = getIndex(
      occurrenceTree.phyla[phylumIndex].classes,
      d.cll,
      "nameClass"
    );
    let familyIndex = getIndex(
      occurrenceTree.phyla[phylumIndex].classes[classIndex].families,
      d.fml,
      "family"
    );
    occurrenceTree.phyla[phylumIndex].classes[classIndex].families[
      familyIndex
    ].genera.push(d);
  });

  for (let i = 0; i < occurrenceTree.phyla.length; i++) {
    let undefinedClassIndex;
    for (let j = 0; j < occurrenceTree.phyla[i].classes.length; j++) {
      let undefinedFamilyIndex;
      for (
        let k = 0;
        k < occurrenceTree.phyla[i].classes[j].families.length;
        k++
      ) {
        if (
          typeof occurrenceTree.phyla[i].classes[j].families[k].family ===
          "undefined"
        ) {
          undefinedFamilyIndex = k;
          occurrenceTree.phyla[i].classes[j].families[k].family =
            "Miscellaneous " +
            (typeof occurrenceTree.phyla[i].classes[j].nameClass ===
              "undefined")
              ? "Miscellaneous unranked taxa"
              : occurrenceTree.phyla[i].classes[j].nameClass;
          occurrenceTree.phyla[i].classes[j].families[k].noFamily = true;
        }
      }

      if (typeof undefinedFamilyIndex != "undefined") {
        occurrenceTree.phyla[i].classes[j].families.push(
          occurrenceTree.phyla[i].classes[j].families.splice(
            undefinedFamilyIndex,
            1
          )[0]
        );
      }

      if (typeof occurrenceTree.phyla[i].classes[j].nameClass === "undefined") {
        undefinedFamilyIndex = j;
        occurrenceTree.phyla[i].classes[j].nameClass =
          "Miscellaneous " +
          (typeof occurrenceTree.phyla[i].phylum === "undefined")
            ? "Miscellaneous unranked taxa"
            : occurrenceTree.phyla[i].phylum;
        occurrenceTree.phyla[i].classes[j].noClass = true;
      }
    }

    if (typeof undefinedClassIndex != "undefined") {
      occurrenceTree.phyla[i].classes.push(
        occurrenceTree.phyla[i].classes.splice(undefinedClassIndex, 1)[0]
      );
    }

    if (typeof occurrenceTree.phyla[i].phylum === "undefined") {
      occurrenceTree.phyla[i].phylum = "Unranked taxa";
      occurrenceTree.phyla[i].unranked = true;
    }
  }

  return occurrenceTree;
}
