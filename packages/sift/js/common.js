 (function() {
  function prefetch(type, callback) {
    $.ajax({
      url: type,
      success: callback
    });
  }

  var lastSuggestion, lastDataset;

  prefetch('http://localhost:5000/api/v1/defs/strat_names?all', function(data) {
    var stratEngine = new Bloodhound({
      datumTokenizer: function(d) {
        return Bloodhound.tokenizers.whitespace(d.name);
      },
      queryTokenizer: Bloodhound.tokenizers.whitespace,
      local: data.success.data,
      limit: 10
    });
    stratEngine.initialize();

    $(".searchBox>input").typeahead(null, 
      {
        name: "strat_names",
        displayKey: function(d) {
          return d.name + " " + d.rank
        },
        minLengh: 1,
        source: stratEngine.ttAdapter(),
        templates: {
          header: "<h5 class='autocompleteCategory'>Strat names</h5>"
        }
      });

    $(".searcher").on("typeahead:selected", function(event, suggestion, dataset) {
      window.location = "/info?strat_id=" + suggestion.id;
    });
    $(".searcher").on("typeahead:autocompleted", function(event, suggestion, dataset) {
      lastSuggestion = suggestion;
      lastDataset = dataset;
      //console.log(suggestion.name, suggestion.id, dataset);
    });
    $(".searcher").on("keypress", function(e) {
      if (e.which == 13) {
        if (typeof(lastSuggestion) !== "undefined") {
          window.location = "/info?strat_id=" + lastSuggestion.id;
        }
      }
    });
  });
 })(); 
  