$(document).ready(function () {
  /*
        ISSUES TO SOLVE
        -some formations, have themselves as the fisrt 'member', but aren't labeled as members in the db.   see #495
        -some formations are ordered wrong. this breaks the UnMergedColun function (because it uses filter)

        -UNCONFORMITIES need to be in the db, and displayed with a wavy or dashed line and note!
        -fossils, unconforms, and other notes need to be added to db, and displayed in borderless column on right

    */

  var utable = $(
    "<table id='my_table' padding='0' cellspacing='0' margin-left='10%'><thead>" +
      "<tr><th width='26' class='period'>Period /Epoch</th>" +
      "<th colspan='3'>&nbsp;Groups Formations & Members</th>" +
      "<th width='48'>&nbsp;Thick- &nbsp;ness</th>" +
      "<th width='38'>Rock Type</th></tr>" +
      "</thead><tbody></tbody></table>"
  );

  // get the uri variables and store them in the global app[] array
  function URLToArray(url) {
    //decode the URL, put vars in array
    var t = [];
    var nohash = url.replace("#", "");
    var pairs = nohash.substring(url.indexOf("?") + 1).split("&");
    for (var i = 0; i < pairs.length; i++) {
      if (!pairs[i]) continue;
      var pair = pairs[i].split("=");
      t[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
    }
    return t;
  }

  var app = URLToArray(document.location.href);
  if (app.col_id) {
    //console.log(app.col_id);
    $("#strat-column").append(utable);
    getStrats(
      "https://macrostrat.org/api/v2/units?response=long&col_id=" + app.col_id
    );
    $("#addUnit").hide();
  }

  // add new unit inputs
  $("#addUnit").click(function () {
    console.log("you clicked me");
    $("#strat-column").append(utable);
    getStrats("https://macrostrat.org/api/v2/units?col_id=482&response=long"); //484, 483, 482, 473, 491, 490, 495  482,491best  (484 has carmel group,fm&mbrs together)
  });

  // ajax to get the units api
  function getStrats(url) {
    $.ajax({
      type: "GET",
      //data:'json',
      url: url,
      //data: { postVar1: 'theValue1', postVar2: 'theValue2' },
      beforeSend: function () {
        // this is where we append a loading image
        $("#ajax-panel").html(
          '<div class="loading"><img src="img/loading.gif" alt="Loading..." /></div>'
        );
      },
      success: function (data) {
        // successful request; do something with the data
        $("#ajax-panel").empty();
        prepareColumn(data); //
      },
      error: function (msg) {
        // failed request; give feedback to user
        $("#ajax-panel").html(
          '<p class="error"><strong>Oops!</strong> Try that again in a few moments.</p>'
        );
      },
    });
  } // end function

  //steps
  // first we loop through and assign t_period and b_periods as well as t_epoch and b_epoch so they're in the array
  // then loop through and find out the SPAN values by counting matching values for period, group, formation, and member (assign p_span, g_span, f_span, g_span)

  // set things up before creating the columns
  function prepareColumn(data) {
    var data = data.success.data;

    // loop through the array and asign top & bottom ages/periods (age names not numbers)
    // the unit_periods should be in the db, but since they aren't
    // we must get them BEFORE our main loop since we need the ajoining values for grep to work
    $.each(data, function (n, unit) {
      unit.b_period = getGeolPeriod(unit.b_age);
      unit.t_period = getGeolPeriod(unit.t_age);
      //console.log(unit);
    });

    // get rid of all the 'Unnamed' units, they are useless & ugly
    data = $.grep(data, function (value) {
      if (value.unit_name != "Unnamed") {
        return value;
      }
    });

    // two options here, merge strat columns before or AFTER creating them
    $.each(data, function (n, unit) {
      createUnmergedColumn(unit, n);
    });
    mergeHtmlCells();
    /* 
     // because the api json data is so unpredictable, this option is problematic
        data = getRowSpans(data); // prep the data by calculating rowspan values for the html table
        $.each(data, function( n,unit ) {
            createMergedColumn(unit, n);
        });
*/
    // get the size of time rows & add long, short or reg images
    adjustPeriodText();
  } // end function

  // loop through columns, then rows- find duplicates and add rowspan attribute to data
  function getRowSpans(data) {
    //console.log(data);  //helps me know which loop we're on

    var tablecolumns = ["t_period", "Gp", "Fm"]; //.Mbr?
    $.each(tablecolumns, function (i, prop) {
      // outer loop..esentially through main table coluns. time, group, period
      //console.log(prop);

      var previous = "";
      var count = 1;
      data = $.each(data, function (n, row) {
        //data.filter(function(row,n) {     // basically the same as .each

        current = row[prop];
        //console.log(prop);
        //console.log(row[prop]);   // or data[n][prop]

        // a lot of surficials units have row names, but no formal Groups, Fms, OR Mbrs
        // if we don't do this, the Fms & Groups will get screwed up.
        if (previous == current && row[prop] != "") {
          // if repeated value
          count = count + 1;
          //console.log("rowspan-"+prop+"= "+count);
          data[n]["rowspan_" + prop] = "null"; // tag cells that need to be hidden

          var i = n - count + 1; //row# minus the matching value count (+1 since n starts at 0)
          // with each new value go BACK to beginning of last value and add the count before we reset it.
          if (data[i]) {
            //since 0-1 = undefined
            //console.log('add to row: '+ i);
            data[i]["rowspan_" + prop] = count; // name the property
          }
        } else {
          // new value

          count = 1; //restart the count
          console.log("rowspan-" + prop + "= " + count);
        }

        previous = row[prop];
        //console.log(data[n-1].t_period);
      }); // .each(row)
    }); // .each(prop)
    console.log(data);
    return data;
  }

  // these are mostly identical.... compare them, and see if I can combine them!  use class=hide instead of not printing rows.

  // creat column nearly EXACTLY like php file, merging duplicate cells @ creation time
  function createMergedColumn(row, n) {
    console.log("creating merged columns (like my php script)");

    // SKIP UNIDENTIFIED UNITS
    if (row.unit_name == "Unnamed" || row.unit_name == "") {
      //row.strat_name_id == null || row.strat_name_id == ''
      //return;
    }
    var td = "<tr id='" + n + "'>\n";

    // IF FMS AND GRP ARE BLANK, USE THE UNIT NAME (sadly this happens a lot)
    // we have to do the same thing in the getRowSpan function
    if (row.unit_name != "" && row.Gp == "" && row.Fm == "") {
      row.Fm = row.unit_name;
    }

    // EACH NEW PERIOD, ADD THE APPROPRIATE ROW SPAN (DONT PRINT REPEATS)
    if (row.t_period && row.rowspan_t_period != "null") {
      // how do we only print the first instance?
      td +=
        "<td class='period time-img " +
        row.t_period +
        "' title='link to paleogeography map' rowspan=" +
        row.rowspan_t_period +
        "><p class='stext ptext'>" +
        row.t_period +
        "</p></td>\n";
    }
    // GROUPS WITHOUT FORMATIONS, PRINT 180 WIDE
    if (row.Gp != "" && row.Fm == "" && row.Mbr == "") {
      td +=
        "<td class='group' width='180' colspan='3'><p class='stext'>" +
        row.Gp +
        "</p></td>\n";
    }
    // GROUPS WITH FORMATIONS, PRINT IT 60 WIDE, WITH THE APPROP ROW SPAN
    if (row.Gp != "" && row.rowspan_Gp != "null" && row.Fm != "") {
      td +=
        "<td class='group' width='60' rowspan=" +
        row.rowspan_Gp +
        "><p class='stext'>" +
        row.Gp +
        "</p></td>\n";
    }
    // FORMATION WITH NO GROUPS OR MEMBERS, MAKE IT FULL 180 WIDE
    if (row.Fm != "" && row.Gp == "" && row.Mbr == "") {
      //xxchange in other?
      td +=
        "<td class='formation' width='180' colspan='3'><p class='stext'> " +
        row.Fm +
        " </p></td>\n";
    }
    // FORMATIONS ARE UNDER A GROUP BUT NO MEMBERS, PRINT THEM 120 WIDE
    if (row.Fm != "" && row.Gp != "" && row.Mbr == "") {
      td +=
        "<td class='formation' width='120' colspan='2'><p class='stext'> " +
        row.Fm +
        " </p></td>\n";
    }
    // FORMATION HAS MEMBERS UNDER IT, PRINT THE FORMATION 60 WIDE
    if (row.Fm != "" && row.rowspan_Fm != "null" && row.Mbr != "") {
      var rspan = 1;
      td +=
        "<td class='formation' width='60' rowspan=" +
        row.rowspan_Fm +
        "><p class='stext'> " +
        row.Fm +
        " </p></td>\n";
    }
    // MEMBER UNDER ONLY A FORMATION
    if (row.Mbr != "" && row.Fm != "" && row.Gp == "") {
      td +=
        "<td class='member' width='120' colspan='2'><p class='stext'> " +
        row.Mbr +
        " </p></td>\n";
    }
    // MEMBER UNDER A FORMATION AND GROUP
    if (row.Mbr != "" && row.Fm != "" && row.Gp != "") {
      td +=
        "<td class='member' width='60'><p class='stext'> " +
        row.Mbr +
        " </p></td>\n";
    }

    // PRINT THE DEPTH AND ROCK_TYPE COLUMNS
    // var thickness = getThickness(row);     // we don't want 20-20ft, so format it.
    var time = parseFloat(row.b_age - row.t_age).toFixed(3); // get the totally length of unit's age
    td +=
      "<td class='thickness' width='48' data-time='" +
      time +
      "' data-maxthick='" +
      row.max_thick +
      "' title='link to thickness map'><p class='stext'>" +
      getThickness(row) +
      "</p></td>\n";

    // PRINT THE ROCK Type
    var lith = getLithImg(row); //use the lith array to get righ lith
    td +=
      "<td class='lith' width='38' background='liths/" +
      lith +
      "' alt='lithology' title='" +
      lith +
      " link to?' >&nbsp;</td>\n";
    td += "</tr>";

    $("#my_table tr:last").after(td);
  } // end createColumn()

  // create column without merging duplicate cells. NOT like php file
  function createUnmergedColumn(row, n) {
    console.log("creating UNmerged columns");

    // SKIP UNIDENTIFIED UNITS
    if (row.strat_name_id == null || row.strat_name_id == "") {
      return;
    }
    var td = "<tr id='" + n + "'>\n";

    // IF THERE'S A PERIOD, PRINT IT WITH THE APPROPRIATE ROW SPAN
    if (row.t_period != "") {
      // how do we only print the first instance?
      td +=
        "<td class='period time-img " +
        row.t_period +
        "' width='26' rowspan='1' title='" +
        row.t_period +
        "-link to paleomap'><p class='stext ptext'>" +
        row.t_period +
        "</p></td>\n";
    }
    // IF THERES A GROUP AND FM, PRINT IT 60 WIDE, WITH THE APPROP ROW SPAN
    if (row.Gp != "" && row.Fm != "") {
      td +=
        "<td class='group' width='60' rowspan='1'><p class='stext'>" +
        row.Gp +
        "</p></td>\n";
    }
    // IF THE FORMATIONS ARE UNDER A GROUP BUT NO MEMBERS, PRINT THEM 60 WIDE
    if (row.Fm != "" && row.Gp != "" && row.Mbr == "") {
      td +=
        "<td class='formation' width='60' rowspan='1' colspan='2'><p class='stext'> " +
        row.Fm +
        " </p></td>\n";
    }
    // IF THERE'S A GROUP & NO FMS OR MBRS, PRINT THE GROUP FULL SPAN
    if (row.Gp != "" && row.Fm == "" && row.Mbr == "") {
      td +=
        "<td class='group' width='180' rowspan='1' colspan='3'><p class='stext'> " +
        row.Gp +
        " </p></td>\n";
    }
    // IF THERE'S A FM BUT NO GROUPS OR MEMBERS, PRINT THE FORMATION FULL SPAN
    if (row.Fm != "" && row.Gp == "" && row.Mbr == "") {
      td +=
        "<td class='formation' width='180' rowspan='1' colspan='3'><p class='stext'> " +
        row.Fm +
        " </p></td>\n";
    }
    // IF THE FORMATION HAS MEMBERS UNDER IT, PRINT THE FORMATION 60 WIDE
    if (row.Fm != "" && row.Mbr != "" && row.Gp == "") {
      var rspan = 1;
      td +=
        "<td class='formation' width='60' rowspan='1' colspan='1'><p class='stext'> " +
        row.Fm +
        " </p></td>\n";
    }
    // IF THERE'S A MEMBER, WITHOUT A GROUP PRINT IT
    if (row.Mbr != "" && row.Gp == "") {
      td +=
        "<td class='member' width='120' colspan='2'><p class='stext'> " +
        row.Mbr +
        " </p></td>\n";
    }

    // IF THE FORMATION IS UNDER A GROUP AND HAS MEMBERS UNDER IT
    if (row.Fm != "" && row.Mbr != "" && row.Gp != "") {
      var rspan = 1;
      td +=
        "<td class='formation' width='60' rowspan='1' colspan='1'><p class='stext'> " +
        row.Fm +
        " </p></td>\n";
    }
    // IF THERE'S A MEMBER, WITH A GROUP PRINT IT
    if (row.Mbr != "" && row.Gp != "") {
      td +=
        "<td class='member' width='60' colspan=''><p class='stext'> " +
        row.Mbr +
        " </p></td>\n";
    }

    // PRINT THE DEPTH AND ROCK_TYPE COLUMNS
    var time = parseFloat(10 * (row.b_age - row.t_age)).toFixed(3); // get the totally length of unit's age
    td +=
      "<td class='thickness' width='48' data-time='" +
      time +
      "' data-maxthick='" +
      row.max_thick +
      "' title='link to thickness map'><p class='stext'>" +
      getThickness(row) +
      "</p></td>\n";

    // PRINT THE ROCK Type
    var lith = getLithImg(row); //use the lith array to get righ lith
    td +=
      "<td class='lith' width='38' background='liths/" +
      lith +
      "' alt='lithology' title='" +
      lith +
      " link to?'>&nbsp;</td>\n";
    td += "</tr>";

    $("#my_table tr:last").after(td);
  } // end createColumn()

  function getThickness(row) {
    var thick = "";
    // if min & max thicknes are same, only display one of them
    if (row.min_thick == row.max_thick) {
      thick = row.max_thick;
    } else {
      //display the range
      thick = row.min_thick + "-" + row.max_thick;
    }
    return thick;
  }

  // this is wrong.   We need to get the t_age and assign it a t_period and t_epic (we have t_ages) we'll use mostly periods
  function getGeolPeriod(t) {
    //t=top_age OR bottom age (get both)
    var p = "";
    if (t > 0 && t <= 2.588) {
      p = "Quaternary";
    } else if (t > 2.588 && t <= 5.332) {
      p = "Plicene";
    } else if (t > 5.332 && t <= 23.03) {
      p = "Neogene";
    } else if (t > 23.03 && t <= 65.5) {
      p = "Paleogene";
    } else if (t > 65.5 && t <= 145.5) {
      p = "Cretaceous";
    } else if (t > 145.5 && t <= 199.6) {
      p = "Jurassic";
    } else if (t > 199.6 && t <= 251.0) {
      p = "Triassic";
    } else if (t > 251.0 && t <= 299.0) {
      p = "Permian";
    } else if (t > 299.0 && t <= 359.2) {
      p = "Carboniferous";
    } else if (t > 359.2 && t <= 416.0) {
      p = "Devonian";
    } else if (t > 416.0 && t <= 443.7) {
      p = "Silurian";
    } else if (t > 443.7 && t <= 488.3) {
      p = "Ordovician";
    } else if (t > 488.3 && t <= 542.0) {
      p = "Cambrian";
    } else if (t > 542.0 && t <= 2500) {
      p = "Proterozoic";
    } else if (t > 2500 && t <= 4000) {
      p = "Archean";
    } else {
      p = "unknown";
    }
    // return the age and store it in t_period
    return p;
  }

  function getLithImg(unit) {
    var lith = unit.lith;
    // go through lit array and return the one with largest percentage
    var pl = lith.reduce(function (max, obj) {
      return obj.num > max.num ? obj : max;
    });
    //console.log(pl);
    var primarylith = pl.name; // this should be the predominate lithology
    var rockImage = "usgs_sandstone.jpg";

    if (primarylith == "sandstone") {
      rockImage = "usgs_sandstone.jpg";
    }
    if (primarylith == "limestone") {
      rockImage = "627-limestone.svg";
    }
    if (primarylith == "shale") {
      rockImage = "620-shale-or-clay2.svg";
    }
    if (primarylith == "siltstone") {
      rockImage = "usgs_siltstone.jpg";
    }
    if (primarylith == "coal") {
      rockImage = "usgs_coal.jpg";
    }
    if (primarylith == "conglomerate") {
      rockImage = "601-conglomerate-matrix.svg";
    }
    if (primarylith == "dolomite") {
      rockImage = "usgs_dolomite.jpg";
    }
    if (primarylith == "alluvium") {
      rockImage = "usgs_alluvium.jpg";
    }
    if (primarylith == "basalt") {
      rockImage = "usgs_flows.jpg";
    }
    if (primarylith == "gneiss") {
      rockImage = "usgs_gneiss.jpg";
    }
    if (primarylith == "gypsum") {
      rockImage = "usgs_gypsum.jpg";
    }
    if (primarylith == "limyshale") {
      rockImage = "usgs_limyshale.jpg";
    }
    if (primarylith == "marble") {
      rockImage = "usgs_marble.jpg";
    }
    if (primarylith == "quartizite") {
      rockImage = "usgs_quartzite.jpg";
    }
    if (primarylith == "salt") {
      rockImage = "usgs_salt.jpg";
    }
    if (primarylith == "schist") {
      rockImage = "usgs_schist.jpg";
    }
    if (primarylith == "igneous1") {
      rockImage = "usgs_igneous1.jpg";
    }
    if (primarylith == "igneous2") {
      rockImage = "usgs_igneous2.jpg";
    }
    if (primarylith == "igneous3") {
      rockImage = "usgs_igneous3.jpg";
    }
    if (primarylith == "igneous4") {
      rockImage = "usgs_igneous4.jpg";
    }
    if (primarylith == "igneous5") {
      rockImage = "usgs_igneous5.jpg";
    }
    if (primarylith == "igneous6") {
      rockImage = "usgs_igneous6.jpg";
    }

    return rockImage;
  }

  // go through table after creation and merge all the duplicates
  // loop through columns, then rows- researching entire table on EACH row (intensive)
  function mergeHtmlCells() {
    console.log("merging duplicate table cells");
    // loop through each column using this class array (each column has seperate class) (we don't want to merge thickness or rocktype columns!)
    var tablecolumns = [".period", ".group", ".formation", ".member"];
    $.each(tablecolumns, function (i, value) {
      //console.log("loop number: "+i);
      var previous = "";
      // we dont want to merge individual Gr, Fms or Mbrs (rowspan=3) with the same units below that may be with a group.
      var prev_cSpan = "";
      var count = 1;

      // create a simply array of JUST this column/field
      // use this to backtrack and change rowspans in the next loop
      var column = $("#my_table tr " + value).each(function () {
        return $(this);
      });

      // now loop through column values & find duplicates
      column.each(function (n, cell) {
        //console.log("<tr id: "+n);
        var current = $(this).text();
        var cSpan = $(this).attr("colspan");
        //console.log(current);
        //console.log(previous);

        // when we get to a new unique value
        // we also need to make sure colspan's match because some groups & fms have wonky layouts
        if (previous === current && prev_cSpan === cSpan) {
          // && colspan is same!
          count = count + 1;
          //console.log("rowspan-"+prop+"= "+count);
          $(this).hide();

          var i = n - count + 1; //row# minus the matching value count (+1 since n starts at 0)
          // with each new value go BACK to beginning of last value and add the count before we reset it.
          if (column[i]) {
            //since 0-1 = undefined
            //console.log('add to row: '+ i);
            $(column[i]).attr("rowspan", count);
          }
        } else {
          // new value
          count = 1; //restart the count
          //console.log("rowspan-"+prop+"= "+count);
        } // end if
        previous = $(this).text(); // set previousCell equal to last cycle's $cell
        prev_cSpan = $(this).attr("colspan");
      }); // end outer .each
    }); // end loop
  } //end function

  // loop through the table and change the period/epoch name images depending on height of cell
  // choose between unit-short.png, unit.png and unit-long.png
  function adjustPeriodText() {
    $("#my_table tr .period").each(function (n, cell) {
      //console.log( $(this).height() );
      if ($(this).height() < 50) {
        $(this).attr("class", function (n, val) {
          return val + "-short";
        });
      } else if ($(this).height() > 90) {
        $(this).attr("class", function (n, val) {
          return val + "-long";
        });
      }
    });
  } // end function

  // add new unit inputs
  $("#expandTime").click(function () {
    expandTime(20);
  });
  function expandTime(multiplier) {
    console.log("expanding by time...");
    var mult = parseInt(multiplier);
    // loop through each cell, get max_thickness
    $("#my_table tr .thickness").each(function (n, cell) {
      var t = $(this).attr("data-time");
      var w = Math.round(Math.log(t) * mult); //.toFixed(0);
      $(this).parent().height(w); //.height();
    });
  }
  // add new unit inputs
  $("#expandThickness").click(function () {
    expandThickness(20);
  });
  function expandThickness(multiplier) {
    console.log("expanding by thickness");
    var mult = parseInt(multiplier);
    // loop through each cell, get max_thickness
    $("#my_table tr .thickness").each(function (n, cell) {
      //console.log($(this).parent() );
      var t = $(this).attr("data-maxthick");
      //console.log(t);
      var w = Math.round(Math.log(t) * mult); //.toFixed(0);
      if ($(this).parent()[0].id == "2") {
        // for texting....
        //console.log("n:"+mult+" t:"+t+" w:"+w);
      }
      //$(this).parent().attr("height", w);  //.height();
      $(this).parent().height(w); //.height();
    });
  }

  $("#thickness-slider").slider({
    orientation: "horizontal",
    range: "min",
    min: 1,
    max: 100,
    value: 1,
    step: 10,
    slide: function (event, ui) {
      console.log(ui.value);
      expandThickness(ui.value);
    },
  });
}); // end document.ready
