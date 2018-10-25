// Lance Weaver's column renderer
// https://geology.utah.gov/apps/lance/strat/display-strat.html?col_id=484
  $(document).ready(function(){


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
        "<th width='38'>Rock Type</th></tr>"+
        "</thead><tbody></tbody></table>"
        );


            // get the uri variables and store them in the global app[] array
        function URLToArray(url) { //decode the URL, put vars in array
            var t = [];
            var nohash = url.replace("#", "");
            var pairs = nohash.substring(url.indexOf('?') + 1).split('&');
            for (var i = 0; i < pairs.length; i++) {
            if (!pairs[i])
                continue;
            var pair = pairs[i].split('=');
            t[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
            }
            return t;

        }

        var app = URLToArray(document.location.href);
        if (app.col_id){
            //console.log(app.col_id);
            $("#strat-column").append(utable);
            getStrats('https://macrostrat.org/api/v2/units?response=long&col_id='+app.col_id);
            $("#addUnit").hide();
        }


        // add new unit inputs
        $('#addUnit').click(function(){
            console.log("you clicked me");
            $("#strat-column").append(utable);
            getStrats('https://macrostrat.org/api/v2/units?col_id=482&response=long');      //484, 483, 482, 473, 491, 490, 495  482,491best  (484 has carmel group,fm&mbrs together)

        });





        // ajax to get the units api
        function getStrats(url){

            $.ajax({
                type: 'GET',
                //data:'json',
                url: url,
                //data: { postVar1: 'theValue1', postVar2: 'theValue2' },
                beforeSend:function(){
                    // this is where we append a loading image
                    $('#ajax-panel').html('<div class="loading"><img src="img/loading.gif" alt="Loading..." /></div>');
                },
                success:function(data){
                    // successful request; do something with the data
                    $('#ajax-panel').empty();
                    prepareColumn(data);    //

                },
                error:function(msg){
                    // failed request; give feedback to user
                    $('#ajax-panel').html('<p class="error"><strong>Oops!</strong> Try that again in a few moments.</p>');
                }
            });

        } // end function

        //steps
        // first we loop through and assign t_period and b_periods as well as t_epoch and b_epoch so they're in the array
        // then loop through and find out the SPAN values by counting matching values for period, group, formation, and member (assign p_span, g_span, f_span, g_span)



        // set things up before creating the columns
        function prepareColumn(data){
            var data = data.success.data;

            // loop through the array and asign top & bottom ages/periods (age names not numbers)
            // the unit_periods should be in the db, but since they aren't
            // we must get them BEFORE our main loop since we need the ajoining values for grep to work
            $.each(data, function( n,unit ) {
                unit.b_period = getGeolPeriod(unit.b_age);
                unit.t_period = getGeolPeriod(unit.t_age);
                //console.log(unit);
            });

            // get rid of all the 'Unnamed' units, they are useless & ugly
            data = $.grep(data, function(value) {
            if (value.unit_name != "Unnamed"){
                return value;
            }
            });

            // two options here, merge strat columns before or AFTER creating them
            $.each(data, function( n,unit ) {
                createUnmergedColumn(unit, n);
            });
            mergeHtmlCells()
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
        function getRowSpans(data){
        //console.log(data);  //helps me know which loop we're on

        var tablecolumns = ['t_period', 'Gp', 'Fm']; //.Mbr?
        $.each( tablecolumns, function(i,prop){             // outer loop..esentially through main table coluns. time, group, period
            //console.log(prop);

            var previous = '';
            var count = 1;
            data = $.each(data,function(n,row) {
            //data.filter(function(row,n) {     // basically the same as .each

                    current = row[prop];
                    //console.log(prop);
                    //console.log(row[prop]);   // or data[n][prop]

                    // a lot of surficials units have row names, but no formal Groups, Fms, OR Mbrs
                    // if we don't do this, the Fms & Groups will get screwed up.
                    if ( previous == current && row[prop] != '' ){     // if repeated value
                        count = count+1;
                        //console.log("rowspan-"+prop+"= "+count);
                        data[n]['rowspan_'+prop] = 'null';     // tag cells that need to be hidden

                        var i = n-count+1;  //row# minus the matching value count (+1 since n starts at 0)
                        // with each new value go BACK to beginning of last value and add the count before we reset it.
                        if (data[i]){    //since 0-1 = undefined
                            //console.log('add to row: '+ i);
                            data[i]['rowspan_'+prop] = count;    // name the property
                        }

                    } else {  // new value

                        count = 1;  //restart the count
                        console.log("rowspan-"+prop+"= "+count);
                    }


                    previous = row[prop]
                    //console.log(data[n-1].t_period);
                })  // .each(row)
            });  // .each(prop)
            console.log( data );
            return data;
        }

        // these are mostly identical.... compare them, and see if I can combine them!  use class=hide instead of not printing rows.


        // creat column nearly EXACTLY like php file, merging duplicate cells @ creation time
        function createMergedColumn(row, n){
            console.log('creating merged columns (like my php script)');

            // SKIP UNIDENTIFIED UNITS
            if (row.unit_name == 'Unnamed' || row.unit_name == ''){    //row.strat_name_id == null || row.strat_name_id == ''
                //return;
            }
            var td = "<tr id='"+n+"'>\n";

            // IF FMS AND GRP ARE BLANK, USE THE UNIT NAME (sadly this happens a lot)
            // we have to do the same thing in the getRowSpan function
            if (row.unit_name != '' && row.Gp == '' && row.Fm == ''){
                row.Fm = row.unit_name;
            }

            // EACH NEW PERIOD, ADD THE APPROPRIATE ROW SPAN (DONT PRINT REPEATS)
            if (row.t_period && row.rowspan_t_period != 'null') {       // how do we only print the first instance?
                td += "<td class='period time-img " + row.t_period + "' title='link to paleogeography map' rowspan=" + row.rowspan_t_period + "><p class='stext ptext'>" + row.t_period + "</p></td>\n";
            }
            // GROUPS WITHOUT FORMATIONS, PRINT 180 WIDE
            if (row.Gp != '' && row.Fm == '' && row.Mbr == '') {   
                td += "<td class='group' width='180' colspan='3'><p class='stext'>" + row.Gp + "</p></td>\n";
            }
            // GROUPS WITH FORMATIONS, PRINT IT 60 WIDE, WITH THE APPROP ROW SPAN
            if (row.Gp != '' && row.rowspan_Gp != 'null' && row.Fm != '') {   
                td += "<td class='group' width='60' rowspan=" + row.rowspan_Gp + "><p class='stext'>" + row.Gp + "</p></td>\n";
            }
            // FORMATION WITH NO GROUPS OR MEMBERS, MAKE IT FULL 180 WIDE
            if (row.Fm != '' && row.Gp == '' && row.Mbr == '') {                              //xxchange in other?
                td += "<td class='formation' width='180' colspan='3'><p class='stext'> " + row.Fm + " </p></td>\n";
            }
            // FORMATIONS ARE UNDER A GROUP BUT NO MEMBERS, PRINT THEM 120 WIDE
            if (row.Fm != '' && row.Gp != '' && row.Mbr == '') {
                td += "<td class='formation' width='120' colspan='2'><p class='stext'> " + row.Fm + " </p></td>\n";
            }
            // FORMATION HAS MEMBERS UNDER IT, PRINT THE FORMATION 60 WIDE
            if (row.Fm != '' && row.rowspan_Fm != 'null' && row.Mbr != '') {
                var rspan = 1;
                td +=  "<td class='formation' width='60' rowspan=" + row.rowspan_Fm + "><p class='stext'> " + row.Fm + " </p></td>\n";
            }
            // MEMBER UNDER ONLY A FORMATION
            if (row.Mbr != '' && row.Fm != '' &&…
