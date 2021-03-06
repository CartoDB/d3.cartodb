var Crossfilter = require('crossfilter')
var cartodb = require('./')
var geo = require('./geo')
function Filter (options) {
  this.options = options || {}
  this.idField = this.options.idField || 'cartodb_id'
  this.crossfilter = new Crossfilter()
  this.dimensions = {}
  this.tiles = {}
  this.visibleTiles = []
  this.filters = {}
}

cartodb.d3.extend(Filter.prototype, cartodb.d3.Event, {
  addTile: function (tilePoint, collection) {
    var tilePointString = tilePoint.x + ':' + tilePoint.y + ':' + tilePoint.zoom
    if (typeof this.tiles[tilePointString] !== 'undefined') return this.getTile(tilePoint)
    var featuresToAdd = []
    collection.features.forEach(function (f) {
      f.properties.tilePoint = tilePoint.x + ':' + tilePoint.y + ':' + tilePoint.zoom
      featuresToAdd.push(f)
    })
    this.crossfilter.add(featuresToAdd)
    this.tiles[tilePointString] = true
    this.fire('featuresChanged');
    return this.getTile(tilePoint)
  },

  removeTile: function (tilePoint) {
    var tilePointString = tilePoint.x + ':' + tilePoint.y + ':' + tilePoint.zoom
    if (!this.dimensions.tiles) {
      return
    }
    this.dimensions.tiles.filter(tilePointString)
    this.crossfilter.remove()
    this.dimensions.tiles.filterAll()
    delete this.tiles[tilePointString]
  },

  getTile: function (tilePoint) {
    var tilePointString = tilePoint.x + ':' + tilePoint.y + ':' + tilePoint.zoom
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
    this._createDimension(column)
    this.dimensions[column].filter(filterfn)
    this.filters[column] = filterfn
    this.fire('filterApplied')
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
      delete this.filters[column]
    }
    this.fire('filterApplied')
  },

  clearFilter: function (column) {
    this.dimensions[column].filterAll()
    delete this.filters[column]
    this.fire('filterApplied')
  },

  getValues: function (ownFilter, column) {
    if (!this.dimensions['tiles']) return []
    var values = []
    if (typeof ownFilter === 'undefined' || ownFilter) {
      values = this.dimensions['tiles'].top(Infinity)
    } else {
      this._createDimension(column)
      this.dimensions[column].filterAll()
      values = this.dimensions[column].top(Infinity)
      this.dimensions[column].filter(this.filters[column])
    }
    if (values.length === 0) return values
    var uniqueValues = []
    var ids = {}
    if (typeof values[0].properties[this.idField] === 'undefined') {
      uniqueValues = values
    } else {
      for (var i = 0; i < values.length; i++) {
        if (!(values[i].properties[this.idField] in ids)) {
          uniqueValues.push(values[i])
          ids[values[i].properties[this.idField]] = true
        }
      }
    }
    if (this.visibleTiles.se) {
      uniqueValues = uniqueValues.filter(function (feature) {
        return geo.contains(this.visibleTiles, feature)
      }.bind(this))
    }

    return uniqueValues
  },

  getColumnValues: function (column, numberOfValues) {
    this._createDimension(column)
    return this.dimensions[column].group().top(numberOfValues || Infinity)
  },

  setBoundingBox: function (visible) {
    this.visibleTiles = visible
  },

  getMax: function (column) {
    this._createDimension(column)
    try {
      return this.dimensions[column].top(1)[0].properties[column]
    } catch (e) {
      return null
    }
  },

  getMin: function (column) {
    this._createDimension(column)
    try {
      return this.dimensions[column].bottom(1)[0].properties[column]
    } catch (e) {
      return null
    }
  },

  getCount: function (column) {
    this._createDimension(column)
    return this.dimensions[column].groupAll().value()
  },

  surveyRandom: function (sampleSize, fn) {
    var randomIndices = []
    var values = this.getValues()
    for (var i = 0; i < sampleSize; i++) {
      randomIndices.push(values[Math.floor(Math.random() * values.length)])
    }
    return randomIndices.map(fn);
  },

  _createDimension: function (column) {
    if (!this.dimensions[column]) {
      var survey = this.surveyRandom(5, function (f) { return typeof f.properties[column] !== 'undefined' })
      if (!survey.some(function (b) { return !b })){
        this.dimensions[column] = this.crossfilter.dimension(function (f) { return f.properties[column] })
      } else {
        throw new Error('Couldn\'t create dimension: column ' + column + ' doesn\'t exist.')
      }
    }
  }
})

Filter.accept = function (terms) {
  if (terms === 'all') {
    return function () { return true }
  } else if (terms === 'none') {
    return function () { return false }
  }
  var termsDict = {}
  terms.forEach(function (t) {
    termsDict[t] = true
  })
  return function (f) {
    if (termsDict[f]) {
      return true
    }
    return false
  }
}

Filter.reject = function (terms) {
  if (terms === 'all') {
    return function () { return false }
  } else if (terms === 'none') {
    return function () { return true }
  }
  var termsDict = {}
  terms.forEach(function (t) {
    termsDict[t] = true
  })
  return function (f) {
    if (!termsDict[f]) {
      return true
    }
    return false
  }
}

module.exports = Filter
