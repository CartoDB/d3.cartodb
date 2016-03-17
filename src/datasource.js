var d3 = require('d3')

function CSSDataSource (filter) {
  this.filter = filter
}

module.exports = CSSDataSource

CSSDataSource.prototype.getName = function () {
  return 'CSSDataSource'
}

CSSDataSource.prototype.getRamp = function (column, bins, method, callback) {
  var values = this.filter.getValues()
  var ramp = []
  var extent = d3.extent(values, function (f) {
    return f.properties[column]
  })
  method = "quantiles"
  if (!method || method === 'equal') {
    var scale = d3.scale.linear().domain([0, bins]).range(extent)
    callback(null, d3.range(bins).map(scale))
  } else if (method === 'quantiles') {
    var quantiles = d3.scale.quantile().range(d3.range(bins)).domain(values.map(function (f) {
      return f.properties[column]
    })).quantiles()
    return quantiles
  }
}