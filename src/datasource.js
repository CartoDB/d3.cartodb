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
  var extent = d3.extent(values, function (f) {
    return f.properties[column]
  })
  if (!method || method === 'equal') {
    var scale = d3.scale.linear().domain([0, bins]).range(extent)
    ramp = d3.range(bins).map(scale)
  } else if (method === 'quantiles') {
    ramp = d3.scale.quantile().range(d3.range(bins)).domain(values.map(function (f) {
      return f.properties[column]
    })).quantiles()
  } else if (method === 'jenks') {
    var valuesInGeoJSON = {
      "type": "FeatureCollection",
      "features": values
    }
    ramp = jenks(valuesInGeoJSON, column, bins);
  } else {
    error = 'Quantification method ' + method + ' is not supported'
  }
  callback(error, ramp)
}
