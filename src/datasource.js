var d3 = require('d3')
var jenks = require('turf-jenks')

function CSSDataSource (filter) {
  this.filter = filter
}

module.exports = CSSDataSource

CSSDataSource.prototype.getName = function () {
  return 'CSSDataSource'
}

CSSDataSource.prototype.getRamp = function (column, bins, method, callback) {
  var ramp = []
  var error = null
  var values = this.filter.getValues()
  var columnAccessor = function (f) {
    return f.properties[column]
  }
  var extent = d3.extent(values, columnAccessor)
  if (!method || method === 'equal') {
    var scale = d3.scale.linear().domain([0, bins]).range(extent)
    ramp = d3.range(bins).map(scale)
  } else if (method === 'quantiles') {
    ramp = d3.scale.quantile().range(d3.range(bins)).domain(values.map(columnAccessor)).quantiles()
  } else if (method === 'jenks') {
    var valuesInGeoJSON = {
      "type": "FeatureCollection",
      "features": values
    }
    ramp = jenks(valuesInGeoJSON, column, bins);
  } else if (method === 'headstails') {
    var sortedValues = values.map(columnAccessor).sort(function(a, b) {
      return a - b;
    });
    if (sortedValues.length < bins) {
      error = 'Number of bins should be lower than total number of rows'
    } else if (sortedValues.length === bins) {
      ramp = sortedValues;
    } else {
      var mean = d3.mean(sortedValues);
      ramp.push(mean);
      for (var i = 1; i < bins; i++) {
        ramp.push(d3.mean(sortedValues.filter(function (v) {
          return v > ramp[length - 1];
        })));
      }
    }
  } else {
    error = new Error('Quantification method ' + method + ' is not supported')
  }
  callback(error, ramp)
}
