
//(function() {
  

  // Make things nice. We like nice things.
  $("#map").css("height", window.innerHeight - 62);

  var map = L.map('map', {
    minZoom: 2,
    maxZoom: 10
  });

  // If there is a hash location, go there immediately
  if (window.location.hash.length > 3) {
    var hashLocation = L.Hash.parseHash(window.location.hash)
    map.setView(hashLocation.center, hashLocation.zoom);
  } else {
    map.setView([47, -95], 4);
  }

  // Make map states linkable
  var hash = new L.Hash(map);

  // Add our basemap
  var stamen = L.tileLayer('http://{s}.tile.stamen.com/toner-lite/{z}/{x}/{y}.png', {
    maptiks_id: 'Stamen toner'
  }).addTo(map);
  stamen.setZIndex(1);

  // Add the geologic basemap
  var geology = L.tileLayer('http://macrostrat.org/tiles/geologic_v2/{z}/{x}/{y}.png', {
    maxZoom: 12,
    opacity: 0.8,
    maptiks_id: 'Geology'
  }).addTo(map);

  geology.setZIndex(100);

  var columnTemplate = $('#column-template').html();
  Mustache.parse(columnTemplate);

  //$.get("http://macrostrat.org/api/v1/columns?all&format=topojson_bare", function(data) {
  $.getJSON("js/columns.topojson", function(data) { 
    columns = L.geoJson(topojson.feature(data, data.objects.output), {
      style: function(feature) {
        return {
          color: '#777',
          fillOpacity: 0.4,
          opacity: 0.8,
          weight: 1
        };
      },
    // Bind some actions to each polygon
      onEachFeature: function (feature, layer) {
        layer.on("click", function(d) { 
          var rendered = Mustache.render(columnTemplate, d.target.feature.properties);
          setUnitInfoContent(rendered, d.latlng);
          console.log(d.target.feature.properties);
        })
        //layer.bindPopup("<strong>Unit link:</strong> " + feature.properties.unit_link + "<br><strong>Age:</strong> " + feature.properties.min_age + " - " + feature.properties.max_age + "<br><strong>Rock type:</strong> " + rocktypes.substr(0, rocktypes.length - 2, -2) + "<br><strong>Lithologies:</strong> " + liths.substr(0, liths.length - 2, -2));
      }
    }).addTo(map);
  });
  // Define our marker out here for ease of adding/removing
  var marker;

  // Custom desaturated icon
  var bwIcon = L.icon({
    iconUrl: 'js/images/marker-icon-bw-2x.png',
    shadowUrl: 'js/images/marker-shadow.png',
    iconSize: [25,41],
    iconAnchor: [12, 41]
  });



  var apiUrl = (window.location.hostname === "localhost") ? "http://localhost:5000" : window.location.origin;


  // Hide info bars and marker when map state changes, window is resized, or bar is closed
  map.on("zoomstart, movestart", hideInfoAndMarker);
  $(window).on("resize", hideInfoAndMarker);
  $(".close").click(hideInfoAndMarker);

  // Show attribution
  $("#info-link").click(function(d) {
    d.preventDefault();
    $(".attr-container").css("visibility", "visible");
  });

  // Show menu
  $("#menu-link").click(function(d) {
    d.preventDefault();
    toggleMenuBar();
  });

  // Make things fast
  var attachFastClick = Origami.fastclick;
  attachFastClick(document.getElementById("not-map"));


  // Removes the marker from the map and hides info bars
  function hideInfoAndMarker() {
    if (map.hasLayer(marker)) {
      map.removeLayer(marker);
    }
    closeRightBar();
    closeBottomBar();
  }

  // Update and open the unit info bars
  function setUnitInfoContent(html, ll) {
    // Make sure they are scrolled to the top
    document.getElementById("unit_info_bottom").scrollTop = 0;
    document.getElementById("unit_info_right").scrollTop = 0;

    // Update the content
    $(".unit_info_content").html(html);

    var maxLength = 200;

    // If the text is long, hide everything after 200 characters
    $(".long-text").each(function() {
      if ($(this).html().length > maxLength && $(this).html().length - maxLength > 50) {
        var firstBit = $(this).html().substr(0, maxLength),
            secondBit = $(this).html().substr(maxLength, $(this).html().length - maxLength);

        $(this).html("<span>" + firstBit + "</span><span class='ellipsis'>... </span><span class='the-rest'>" + secondBit + "</span><span class='show-more'> >>></span>");
      }
    });

    // Show everything after 200 characters on click
    $(".show-more").click(function(d) {
      if ($(this).siblings(".the-rest").hasClass("view-text")) {
        $(this).html(" >>>");
        $(this).siblings(".ellipsis").removeClass("hidden");
        $(this).siblings(".the-rest").removeClass("view-text");
      } else {
        $(this).html(" <<<");
        $(this).siblings(".ellipsis").addClass("hidden");
        $(this).siblings(".the-rest").addClass("view-text");
      }
    });

    // Space things out
    $("#unit_info_right").find(".lt-holder").last().css("padding-bottom", "40px");
    $("#unit_info_bottom").find(".lt-holder").last().css("padding-bottom", "40px");
    toggleUnitInfoBar(ll);
  }

  // Open the right info bar depending on the screen orientation
  function toggleUnitInfoBar(ll) {
    // Landscape
    if (window.innerWidth > window.innerHeight) {
      centerMapRight(ll);
      openRightBar();
    } else {
    // Portrait
      centerMapBottom(ll);
      openBottomBar();
    }
  }

  function toggleRightBar() {
    if ($("#unit_info_right").hasClass("moveRight")) {
      closeRightBar();
    } else {
      openRightBar();
    }
  }
  function openRightBar() {
    
    $("#unit_info_right").addClass("moveRight");
  }

  function closeRightBar() {
    $("#unit_info_right").removeClass("moveRight");
  }

  function toggleBottomBar() {
    if ($("#unit_info_bottom").hasClass("moveDown")) {
      closeBottomBar();
    } else {
      openBottomBar();
    }
  }
  function openBottomBar() {
    
    $("#unit_info_bottom").addClass("moveDown");
  }
  function closeBottomBar() {
    $("#unit_info_bottom").removeClass("moveDown");
  }


  function toggleMenuBar() {
    if ($("#unit_info_left").hasClass("moveLeft")) {
      
    } else {
      openMenuBar();
    }
  }

  /* Via https://gist.github.com/missinglink/7620340 */
  L.Map.prototype.panToOffset = function (latlng, offset, options) {
    var x = this.latLngToContainerPoint(latlng).x - offset[0],
        y = this.latLngToContainerPoint(latlng).y - offset[1],
        point = this.containerPointToLatLng([x, y]),
        opts = (options) ? options : {"animate": true, "duration": 0.6, "noMoveStart": true};

    return this.setView(point, this._zoom, { pan: opts })
  }

  function centerMapRight(ll){
    var contentWidth = $("#unit_info_right").width() / 2;
    map.panToOffset( ll, [ -contentWidth, 0 ] );
  }

  function centerMapBottom(ll){
    var contentWidth = $("#unit_info_bottom").height() / 2;
    map.panToOffset( ll, [ 0, -contentWidth ] );
  }

//})();
