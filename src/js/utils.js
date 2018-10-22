export const addCommas = x => {
  x = parseInt(x);
  var parts = x.toString().split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

export const sum = (data, prop) => {
  if (!data || !data.length) {
    return []
  }
  return data.map(d => { return d[prop] }).reduce((a, b) => { return a + b }, 0)
}

export const normalizeLng = (lng) => {
  // via https://github.com/Leaflet/Leaflet/blob/32c9156cb1d1c9bd53130639ec4d8575fbeef5a6/src/core/Util.js#L87
  return (((lng - 180) % 360 + 360) % 360 - 180).toFixed(4)
}

export const hexToRgb = (hex) => {
  if (!hex) { return 'rgba(0,0,0,0.3)'}
  hex = hex.replace('#', '')
  let bigint = parseInt(hex, 16)
  let r = (bigint >> 16) & 255
  let g = (bigint >> 8) & 255
  let b = bigint & 255
  return `rgba(${r},${g},${b},0.8)`
}

export const timescale = [ { name: 'Quaternary',
    abbrev: 'Q',
    t_age: 0,
    b_age: 2.588,
    color: '#F9F97F' },
  { name: 'Neogene',
    abbrev: 'Ng',
    t_age: 2.588,
    b_age: 23.03,
    color: '#FFE619' },
  { name: 'Paleogene',
    abbrev: 'Pg',
    t_age: 23.03,
    b_age: 66,
    color: '#FD9A52' },
  { name: 'Cretaceous',
    abbrev: 'K',
    t_age: 66,
    b_age: 145,
    color: '#7FC64E' },
  { name: 'Jurassic',
    abbrev: 'J',
    t_age: 145,
    b_age: 201.3,
    color: '#34B2C9' },
  { name: 'Triassic',
    abbrev: 'Tr',
    t_age: 201.3,
    b_age: 252.17,
    color: '#812B92' },
  { name: 'Permian',
    abbrev: 'P',
    t_age: 252.17,
    b_age: 298.9,
    color: '#F04028' },
  { name: 'Carboniferous',
    abbrev: 'C',
    t_age: 298.9,
    b_age: 358.9,
    color: '#67A599' },
  { name: 'Devonian',
    abbrev: 'D',
    t_age: 358.9,
    b_age: 419.2,
    color: '#CB8C37' },
  { name: 'Silurian',
    abbrev: 'S',
    t_age: 419.2,
    b_age: 443.8,
    color: '#B3E1B6' },
  { name: 'Ordovician',
    abbrev: 'O',
    t_age: 443.8,
    b_age: 485.4,
    color: '#009270' },
  { name: 'Cambrian',
    abbrev: 'Cm',
    t_age: 485.4,
    b_age: 541,
    color: '#7FA056' },
  { name: 'Ediacaran',
    abbrev: 'E',
    t_age: 541,
    b_age: 635,
    color: '#FFC3E1' },
  { name: 'Cryogenian',
    abbrev: 'Cr',
    t_age: 635,
    b_age: 720,
    color: '#FFAFD7' },
  { name: 'Tonian',
    abbrev: 'T',
    t_age: 720,
    b_age: 1000,
    color: '#FFA5D2' },
  { name: 'Stenian',
    abbrev: 'St',
    t_age: 1000,
    b_age: 1200,
    color: '#FFA5D2' },
  { name: 'Ectasian',
    abbrev: 'Ec',
    t_age: 1200,
    b_age: 1400,
    color: '#FF98CC' },
  { name: 'Calymmian',
    abbrev: 'Ca',
    t_age: 1400,
    b_age: 1600,
    color: '#FF8BC5' },
  { name: 'Statherian',
    abbrev: 'St',
    t_age: 1600,
    b_age: 1800,
    color: '#EE93C1' },
  { name: 'Orosirian',
    abbrev: 'Or',
    t_age: 1800,
    b_age: 2050,
    color: '#E874AF' },
  { name: 'Rhyacian',
    abbrev: 'R',
    t_age: 2050,
    b_age: 2300,
    color: '#EB84B8' },
  { name: 'Siderian',
    abbrev: 'Sd',
    t_age: 2300,
    b_age: 2500,
    color: '#E874AF' } ]

export const makeOccurrenceTree = (data) => {
  let occurrenceTree = {'phyla': []}
  let rankMap = { 25: 'unranked', 23: 'kingdom', 22: 'subkingdom',
    21: 'superphylum', 20: 'phylum', 19: 'subphylum',
    18: 'superclass', 17: 'class', 16: 'subclass', 15: 'infraclass',
    14: 'superorder', 13: 'order', 12: 'suborder', 11: 'infraorder',
    10: 'superfamily', 9: 'family', 8: 'subfamily',
    7: 'tribe', 6: 'subtribe', 5: 'genus', 4: 'subgenus',
    3: 'species', 2: 'subspecies' }

  function getIndex(data, term, property) {
    for(let i=0, len=data.length; i<len; i++) {
      if (data[i][property] === term) return i
    }
    return -1
  }

  data.forEach(d => {
    // Some preprocessing
    d.rank = (d.rnk) ? rankMap[d.rnk] : (d.idr) ? rankMap[d.idr] : 'Unknown'
    d.italics = (d.rnk < 6) ? 'italics' : ''
    if (typeof d.tna === 'undefined') { d.tna = d.idn; }
    d.old_name = (d.tna.split(' ')[0] != d.idg) ? d.tna : ''
    d.url = (d.rank === 'species') ? (d.idg + ' ' + d.ids) : (d.tid) ? ((d.tid.split(':')[1] > 0) ? d.idg : '') : ''

    // If it has a genus name...
    if (d.idg) {
      let genusRes = (d.rsg) ? d.rsg + ' ' : ''
      let speciesRes = (d.rss) ? ' ' + d.rss + ' ' : ' ';
      d.genusRes = genusRes;
      // If it's a species...
      if (d.rank === 'species') {
        d.display_name1 = d.tna
        d.display_name2 = (d.tna != (d.idg + ' ' + d.ids)) ? ('(' + d.tna + ')') : ''
        d.display_name3 = ''
      } else {
        d.display_name1 = d.idg
        d.display_name2 = speciesRes
        d.display_name3 = d.ids
      }
    } else {
      d.display_name1 = d.tna
      d.display_name2 = ''
    }

    // Find unique phyla
    let phyla = []
    for (let i = 0; i < occurrenceTree.phyla.length; i++) {
      phyla.push(occurrenceTree.phyla[i].phylum)
    }

    if (phyla.indexOf(d.phl) < 0) {
      let newPhylum = {'phylum': d.phl, 'classes': []}
      occurrenceTree.phyla.push(newPhylum)
    }

    // Find unique phylum/class combinations
    let phyla_classes = []
    for (let i = 0; i < occurrenceTree.phyla.length; i++) {
      for (let j = 0; j < occurrenceTree.phyla[i].classes.length; j++) {
        phyla_classes.push(occurrenceTree.phyla[i].phylum + '-' + occurrenceTree.phyla[i].classes[j].nameClass)
      }
    }

    if (phyla_classes.indexOf(d.phl + '-' + d.cll) < 0) {
      let newClass = {'nameClass': d.cll, 'families': []}
      let phylumIndex = getIndex(occurrenceTree.phyla, d.phl, 'phylum')
      occurrenceTree.phyla[phylumIndex]['classes'].push(newClass)
    }

    // Find unique phylum/class/family combinations
    let phyla_class_family = []
    for (let i = 0; i < occurrenceTree.phyla.length; i++) {
      for (let j = 0; j < occurrenceTree.phyla[i].classes.length; j++) {
        for (let k = 0; k < occurrenceTree.phyla[i].classes[j].families.length; k++) {
          phyla_class_family.push(occurrenceTree.phyla[i].phylum + '-' + occurrenceTree.phyla[i].classes[j].nameClass + '-' + occurrenceTree.phyla[i].classes[j].families[k].family)
        }
      }
    }

    if (phyla_class_family.indexOf(d.phl + '-' + d.cll + '-' + d.fml) < 0) {
      let newFamily = {'family': d.fml, 'genera': []}
      let phylumIndex = getIndex(occurrenceTree.phyla, d.phl, 'phylum')
      let classIndex = getIndex(occurrenceTree.phyla[phylumIndex].classes, d.cll, 'nameClass')
      occurrenceTree.phyla[phylumIndex].classes[classIndex]['families'].push(newFamily)
    }

    // Place genera into the right phylum/class/family
    let phylumIndex = getIndex(occurrenceTree.phyla, d.phl, 'phylum')
    let classIndex = getIndex(occurrenceTree.phyla[phylumIndex].classes, d.cll, 'nameClass')
    let familyIndex = getIndex(occurrenceTree.phyla[phylumIndex].classes[classIndex].families, d.fml, 'family')
    occurrenceTree.phyla[phylumIndex].classes[classIndex].families[familyIndex].genera.push(d)
  })

  for (let i = 0; i < occurrenceTree.phyla.length; i++) {
    let undefinedClassIndex
    for (let j = 0; j < occurrenceTree.phyla[i].classes.length; j++) {
      let undefinedFamilyIndex
      for (let k = 0; k < occurrenceTree.phyla[i].classes[j].families.length; k++) {
        if (typeof(occurrenceTree.phyla[i].classes[j].families[k].family) === 'undefined') {
          undefinedFamilyIndex = k
          occurrenceTree.phyla[i].classes[j].families[k].family = 'Miscellaneous ' + (typeof(occurrenceTree.phyla[i].classes[j].nameClass) === 'undefined') ? 'Miscellaneous unranked taxa' : occurrenceTree.phyla[i].classes[j].nameClass
          occurrenceTree.phyla[i].classes[j].families[k].noFamily = true
        }
      }

      if (typeof(undefinedFamilyIndex) != 'undefined') {
        occurrenceTree.phyla[i].classes[j].families.push(occurrenceTree.phyla[i].classes[j].families.splice(undefinedFamilyIndex, 1)[0])
      }

      if (typeof(occurrenceTree.phyla[i].classes[j].nameClass) === 'undefined') {
        undefinedFamilyIndex = j
        occurrenceTree.phyla[i].classes[j].nameClass = 'Miscellaneous ' + (typeof(occurrenceTree.phyla[i].phylum) === 'undefined') ? 'Miscellaneous unranked taxa' : occurrenceTree.phyla[i].phylum
        occurrenceTree.phyla[i].classes[j].noClass = true
      }
    }

    if (typeof(undefinedClassIndex) != 'undefined') {
      occurrenceTree.phyla[i].classes.push(occurrenceTree.phyla[i].classes.splice(undefinedClassIndex, 1)[0])
    }

    if (typeof(occurrenceTree.phyla[i].phylum) === 'undefined') {
      occurrenceTree.phyla[i].phylum = 'Unranked taxa'
      occurrenceTree.phyla[i].unranked = true
    }
  }

  return occurrenceTree
}
