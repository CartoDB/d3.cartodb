d3 = require('d3')

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
  if (!method || method === 'equal') {
    var scale = d3.scale.linear().domain([0, bins-1]).range(extent)
    for (var i = 0; i < bins; i++) {
      ramp.push(scale(i))
    }
    callback(null, ramp);
  } else if (method === 'quantiles') {
    var scale = d3.scale.quantile()
  }
}