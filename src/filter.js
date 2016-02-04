var Crossfilter = require('crossfilter')
var cartodb = require('./')

function Filter () {
  this.crossfilter = new Crossfilter()
  this.dimensions = {}
  this.tiles = {}
  this.report = {}
  this.expressions = {}
}

cartodb.d3.extend(Filter.prototype, cartodb.d3.Event, {
  addTile: function (tilePoint, collection) {
    var tilePointString = tilePoint.zoom + ':' + tilePoint.x + ':' + tilePoint.y
    if (typeof this.tiles[tilePointString] !== 'undefined') return this.getTile(tilePoint)
    this.crossfilter.add(collection.features.map(function (f) {
      f.properties.tilePoint = tilePoint.zoom + ':' + tilePoint.x + ':' + tilePoint.y
      return f
    }))
    this.tiles[tilePointString] = true
    return this.getTile(tilePoint)
  },

  removeTile: function (tilePoint) {
    var tilePointString = tilePoint.zoom + ':' + tilePoint.x + ':' + tilePoint.y
    if (!this.dimensions.tiles) {
      return
    }
    this.dimensions.tiles.filter(tilePointString)
    this.crossfilter.remove()
    this.dimensions.tiles.filterAll()
    delete this.tiles[tilePointString]
  },

  getTile: function (tilePoint) {
    var tilePointString = tilePoint.zoom + ':' + tilePoint.x + ':' + tilePoint.y
    if (!this.dimensions.tiles) {
      this.dimensions.tiles = this.crossfilter.dimension(function (f) { return f.properties.tilePoint })
    }
    var tile = {type: 'FeatureCollection', features: null}
    this.dimensions.tiles.filter(tilePointString)
    tile.features = this.dimensions.tiles.top(Infinity)
    this.dimensions.tiles.filterAll()
    return tile
  },

  filterRange: function (column, range) {
    this.filter(column, range)
  },

  filter: function (column, filterfn) {
    if (!this.dimensions[column]) {
      this.dimensions[column] = this.crossfilter.dimension(function (f) { return f.properties[column] })
    }
    this.dimensions[column].filter(filterfn)
  },

  filterAccept: function (column, terms) {
    this.filter(column, Filter.accept(terms))
  },

  filterReject: function (column, terms) {
    this.filter(column, Filter.reject(terms))
  },

  clearFilters: function () {
    for (var column in this.dimensions) {
      this.dimensions[column].filterAll()
    }
  },

  clearFilter: function (column) {
    this.dimensions[column].filterAll()
  },

  getValues: function () {
    if (!this.dimensions['tiles']) return []
    return this.dimensions['tiles'].top(Infinity)
  },

  setBoundingBox: function (north, east, south, west) {
    if (!this.dimensions.bbox) {
      this.dimensions.bbox = this.crossfilter.dimension(function (f) { return f.geometry })
      this.dimensions.bbox.filter(function (g) {
        var north = this[0]
        var east = this[1]
        var south = this[2]
        var west = this[3]
        return g.coordinates[1] < north &&
        g.coordinates[0] < east &&
        g.coordinates[1] > south &&
        g.coordinates[0] > west
      }.bind(arguments))
    }
  }
})

Filter.accept = function (terms) {
  var termsDict = {}
  terms.forEach(function (t) {
    termsDict[t] = true
  })
  return function (f) {
    if (termsDict[f]) {
      return true
    }
  }
}

Filter.reject = function (terms) {
  var termsDict = {}
  terms.forEach(function (t) {
    termsDict[t] = true
  })
  return function (f) {
    if (!termsDict[f]) {
      return true
    }
  }
}

module.exports = Filter
