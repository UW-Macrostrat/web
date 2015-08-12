 (function() {

  var apiUrl = (window.location.hostname === "localhost") ? "http://localhost:5000" : window.location.origin;
  var rankMap = {"SGp": null, "Gp": "sgp", "Fm": "gp", "Mbr": "fm", "Bed": "fm", 1: null, 2: "sgp", 3: "gp", 4: "fm", 5: "fm"};

  function prefetch(type, callback) {
    $.ajax({
      url: type,
      success: callback
    });
  }

  var lastSuggestion, lastDataset;

  prefetch(apiUrl + "/api/v2/defs/columns?all", function(data) {
    data.success.data.forEach(function(d) {
      d.id = d.col_id;
    });

    var columnEngine = new Bloodhound({
      datumTokenizer: function(d) {
        return Bloodhound.tokenizers.whitespace(d.col_name);
      },
      queryTokenizer: Bloodhound.tokenizers.whitespace,
      local: data.success.data,
      limit: 5
    });

    columnEngine.initialize();

    prefetch(apiUrl + "/api/v2/defs/strat_names?all", function(data) {
      data.success.data.forEach(function(d) {
        d.id = d.strat_name_id;
        if (d[rankMap[d.rank]]) {
          d.name = d.strat_name + " " + d.rank + " (" + d[rankMap[d.rank]] + " " + rankMap[d.rank] + ")"
        } else {
          d.name = d.strat_name + " " + d.rank;
        }
      });

      var stratEngine = new Bloodhound({
        datumTokenizer: function(d) {
          return Bloodhound.tokenizers.whitespace(d.strat_name);
        },
        queryTokenizer: Bloodhound.tokenizers.whitespace,
        local: data.success.data,
        limit: 10
      });
      stratEngine.initialize();

      prefetch(apiUrl + "/api/v2/defs/groups?all", function(data) {
        data.success.data.forEach(function(d) {
          d.id = d.col_group_id;
        });
        var groupEngine = new Bloodhound({
          datumTokenizer: function(d) {
            return Bloodhound.tokenizers.whitespace(d.col_group);
          },
          queryTokenizer: Bloodhound.tokenizers.whitespace,
          local: data.success.data,
          limit: 10
        });

        groupEngine.initialize();

        $(".searchBox>input").typeahead(null,
          {
            name: "strat_name_id",
            displayKey: function(d) {
              return d.name;
            },
            minLengh: 1,
            source: stratEngine.ttAdapter(),
            templates: {
              header: "<h5 class='autocompleteCategory'>Lithostratigraphic names</h5>"
            }
          },
          {
            name: "col_group_id",
            displayKey: function(d) {
              return d.col_group
            },
            minLengh: 2,
            source: groupEngine.ttAdapter(),
            templates: {
              header: "<h5 class='autocompleteCategory'>Column groups</h5>"
            }
          },
          {
            name: "col_id",
            displayKey: function(d) {
              return d.col_name
            },
            minLengh: 2,
            source: columnEngine.ttAdapter(),
            templates: {
              header: "<h5 class='autocompleteCategory'>Columns</h5>"
            }
          }
        );

        $(".searcher").on("typeahead:selected", function(event, suggestion, dataset) {
          window.location = "/sift/info/?" + dataset + "=" + suggestion.id;
        });
        $(".searcher").on("typeahead:autocompleted", function(event, suggestion, dataset) {
          lastSuggestion = suggestion;
          lastDataset = dataset;
          //console.log(suggestion.name, suggestion.id, dataset);
        });
        $(".searcher").on("keypress", function(e) {
          if (e.which == 13) {
            if (typeof(lastSuggestion) !== "undefined") {
              window.location = "/sift/info/?" + lastDataset + "=" + lastSuggestion.id;
            }
          }
        });
      });
    });
  });
 })();
