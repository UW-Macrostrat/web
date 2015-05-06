(function() {
  
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
  var mapbox = L.tileLayer('https://{s}.tiles.mapbox.com/v3/jczaplewski.j751k57j/{z}/{x}/{y}.png').addTo(map);;
  mapbox.setZIndex(1);

  // Add the geologic basemap
  var geology = L.tileLayer('http://macrostrat.org/tiles/geologic_v2/{z}/{x}/{y}.png', {
    maxZoom: 12,
    opacity: 0.8
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
      }
    }).addTo(map);
  });

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

})();
