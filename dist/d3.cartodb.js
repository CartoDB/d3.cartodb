(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.cartodb = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
var Event = {}
Event.on = function (evt, callback) {
  var cb = this._evt_callbacks = this._evt_callbacks || {}
  var l = cb[evt] || (cb[evt] = [])
  l.push(callback)
  return this
}

Event.trigger = function (evt) {
  var c = this._evt_callbacks && this._evt_callbacks[evt]
  for (var i = 0; c && i < c.length; ++i) {
    c[i].apply(this, Array.prototype.slice.call(arguments, 1))
  }
  return this
}

Event.fire = Event.trigger

Event.off = function (evt, callback) {
  var c = this._evt_callbacks && this._evt_callbacks[evt]
  if (c && !callback) {
    delete this._evt_callbacks[evt]
    return this
  }
  var remove = []
  for (var i = 0; c && i < c.length; ++i) {
    if (c[i] === callback) remove.push(i)
  }
  while ((i = remove.pop()) !== undefined) c.splice(i, 1)
  return this
}

Event.callbacks = function (evt) {
  return (this._evt_callbacks && this._evt_callbacks[evt]) || []
}

function extend () {
  var objs = arguments
  var a = objs[0]
  for (var i = 1; i < objs.length; ++i) {
    var b = objs[i]
    for (var k in b) {
      a[k] = b[k]
    }
  }
  return a
}

function clone (a) {
  return extend({}, a)
}

function isFunction (f) {
  return typeof f === 'function' || false
}

function isArray (value) {
  return value && typeof value === 'object' && Object.prototype.toString.call(value) === '[object Array]'
}

// types
var types = {
  Uint8Array: typeof (global['Uint8Array']) !== 'undefined' ? global.Uint8Array : Array,
  Uint8ClampedArray: typeof (global['Uint8ClampedArray']) !== 'undefined' ? global.Uint8ClampedArray : Array,
  Uint32Array: typeof (global['Uint32Array']) !== 'undefined' ? global.Uint32Array : Array,
  Int16Array: typeof (global['Int16Array']) !== 'undefined' ? global.Int16Array : Array,
  Int32Array: typeof (global['Int32Array']) !== 'undefined' ? global.Int32Array : Array
}

function isBrowserSupported () {
  return !!document.createElement('canvas')
}

function userAgent () {
  return typeof navigator !== 'undefined' ? navigator.userAgent : ''
}

var flags = {
  sprites_to_images: userAgent().indexOf('Safari') === -1 && userAgent().indexOf('Firefox') === -1
}

module.exports = {
  Event: Event,
  extend: extend,
  clone: clone,
  isFunction: isFunction,
  isArray: isArray,
  types: types,
  isBrowserSupported: isBrowserSupported,
  flags: flags
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],2:[function(require,module,exports){
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

},{"d3":undefined,"turf-jenks":undefined}],3:[function(require,module,exports){
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

},{"./":5,"./geo":4,"crossfilter":undefined}],4:[function(require,module,exports){
module.exports = {
  tile2lon: function (x, z) {
    return (x / Math.pow(2, z) * 360 - 180)
  },
  tile2lat: function (y, z) {
    var n = Math.PI - 2 * Math.PI * y / Math.pow(2, z)
    return (180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))))
  },
  geo2Webmercator: function (x_lon, y_lat) {
    x_lon = x_lon % 180
    // 0.017453292519943295 => Deg to rad constant
    var num = x_lon * 0.017453292519943295
    // 6378137 => Earth radius
    var x = 6378137.0 * num
    var a = y_lat * 0.017453292519943295
    var x_mercator = x
    var y_mercator = 3189068.5 * Math.log((1.0 + Math.sin(a)) / (1.0 - Math.sin(a)))
    return {x: x_mercator, y: y_mercator}
  },
  wrapX: function (x, zoom) {
    var limit_x = Math.pow(2, zoom)
    var corrected_x = ((x % limit_x) + limit_x) % limit_x
    return corrected_x
  },
  hashFeature: function (id, tilePoint) {
    var x = tilePoint.x
    var z = tilePoint.zoom
    if (typeof tilePoint === 'string') {
      tilePoint = tilePoint.split(':')
      x = tilePoint[0]
      z = tilePoint[2]
    }
    var pane = Math.floor(x / Math.pow(2, z))
    return [id, pane].join(':')
  },
  lng2tile: function (lon, zoom) { return (Math.floor((lon + 180) / 360 * Math.pow(2, zoom))) },
  lat2tile: function (lat, zoom) { return (Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom))) },

  latLng2Tile: function (lat, lng, zoom) {
    return {x: this.lng2tile(lng, zoom),
            y: this.lat2tile(lat, zoom),
            zoom: zoom}
  },

  contains: function (boundingBox, feature) {
    var self = this
    function somePointInBB (line) {
      return line.some(function (point) {
        return self.pointInBB(boundingBox, point)
      })
    }
    if (feature.geometry.type === 'GeometryCollection') {
      return feature.geometry.geometries.some(function (geometry) {
        return geometry.coordinates.some(somePointInBB)
      })
    } else if (typeof feature.geometry.coordinates[0] === 'number') {
      return this.pointInBB(boundingBox, feature.geometry.coordinates)
    } else if (feature.geometry.type === 'MultiLineString' || feature.geometry.type === 'MultiPolygon') {
      var geometries = feature.geometry.coordinates
      for (var multipoly = 0; multipoly < geometries.length; multipoly++) {
        for (var poly = 0; poly < geometries[multipoly].length; poly++) {
          return this.anyPointInBB(boundingBox, geometries[multipoly][poly])
        }
      }
    } else if (feature.geometry.type === 'LineString' || feature.geometry.type === 'Polygon') {
      var geometries = feature.geometry.coordinates
      for (var poly = 0; poly < geometries.length; poly++) {
        return this.anyPointInBB(boundingBox, geometries[poly])
      }
    }
  },

  anyPointInBB: function (boundingBox, feature) {
    for (var point = 0; point < feature.length; point++) {
      var thisPoint = feature[point]
      if (this.pointInBB(boundingBox, thisPoint)) return true
    }
  },

  pointInBB: function (boundingBox, feature) {
    return (boundingBox.se.x >= feature[0] &&
      feature[0] >= boundingBox.nw.x &&
      boundingBox.se.y <= feature[1] &&
      feature[1] <= boundingBox.nw.y)
  }
}

},{}],5:[function(require,module,exports){
module.exports.d3 = require('./core')
require('./leaflet_d3.js')
var elements = {
  Util: require('./util.js'),
  geo: require('./geo.js'),
  Renderer: require('./renderer.js'),
  net: require('./net.js'),
  Filter: require('./filter.js'),
  provider: require('./providers')
}
for (var key in elements) {
  module.exports.d3[key] = elements[key]
}

},{"./core":1,"./filter.js":3,"./geo.js":4,"./leaflet_d3.js":6,"./net.js":7,"./providers":8,"./renderer.js":12,"./util.js":14}],6:[function(require,module,exports){
var Renderer = require('./renderer')
var providers = require('./providers')
var TileLoader = require('./tileloader')
var geo = require('./geo')
var L = window.L

L.CartoDBd3Layer = L.TileLayer.extend({
  options: {
    minZoom: 0,
    maxZoom: 28,
    tileSize: 256,
    zoomOffset: 0,
    tileBuffer: 50
  },

  events: {
    featureOver: null,
    featureOut: null,
    featureClick: null
  },

  initialize: function (options) {
    options = options || {}
    this.renderers = []
    this.svgTiles = {}
    this.eventCallbacks = {}
    this._animated = true
    L.Util.setOptions(this, options)
    var styles = this.options.styles
    if (!styles) {
      styles = [this.options.cartocss]
      this.options.styles = styles
    }
    if (this.options.layers && this.options.user) {
      this.provider = new providers.WindshaftProvider(this.options)
    } else {
      this.provider = new providers.XYZProvider(this.options)
    }
    this.provider.on('ready', this._resetRenderers.bind(this))
  },

  on: function (eventName, callback) {
    if (eventName in this.events) {
      if (this.renderers.length > 0) {
        this.renderers.forEach(function (renderer) {
          renderer.on(eventName, callback)
        })
      } else {
        this.eventCallbacks[eventName] = callback
      }
    } else {
      L.TileLayer.prototype.on.call(this, arguments[0], arguments[1])
    }
  },

  _getVisibleTiles: function () {
    var bounds = this._map.getBounds()
    var zoom = this._map.getZoom()
    var northWest = bounds.getNorthWest()
    var southEast = bounds.getSouthEast()
    var nwTile = geo.latLng2Tile(northWest.lat, northWest.lng, zoom)
    var seTile = geo.latLng2Tile(southEast.lat, southEast.lng, zoom)
    var tiles = []
    var ring = []
    for (var y = nwTile.y; y <= seTile.y; y++) {
      for (var x = nwTile.x; x <= seTile.x; x++) {
        if (y === nwTile.y || y === seTile.y || x === nwTile.x || x === seTile.x) {
          ring.push([x, y, zoom].join(':'))
        } else {
          tiles.push([x, y, zoom].join(':'))
        }
      }
    }
    var se = geo.geo2Webmercator(southEast.lng, southEast.lat)
    var nw = geo.geo2Webmercator(northWest.lng, northWest.lat)
    return { tiles: tiles, ring: ring, se: se, nw: nw }
  },

  applyFilter: function (sublayerIndex, filterType, filterOptions) {
    var sublayer = this.renderers[sublayerIndex]
    switch (filterType) {
      case 'accept':
        sublayer.filter.filterAccept(filterOptions.column, filterOptions.values)
        break
      case 'reject':
        sublayer.filter.filterReject(filterOptions.column, filterOptions.values)
        break
      case 'range':
        sublayer.filter.filterRange(filterOptions.column, [filterOptions.min, filterOptions.max])
        break
    }
    sublayer.redraw()
  },

  setProvider: function (options) {
    this.styles = options.styles
    this.provider.setURL(options.urlTemplate)
  },
  setUrl: function (url) {
    this.setProvider({
      styles: this.options.styles,
      urlTemplate: url
    })
  },

  featuresLoaded: function () {
    if (!this.provider) return false
    return this.provider.allTilesLoaded()
  },

  getFilter: function (layerIndex) {
    return this.renderers[layerIndex].filter
  },

  getFeatures: function () {
    var features = []
    if (this.renderers.length > 0) {
      this.renderers.forEach(function (r) {
        features.push(r.filter.getValues())
      })
    }
    return features
  },

  onAdd: function (map) {
    this._map = map
    this.options.map = map
    this.options.layer = this
    this._initContainer()

    this.tileLoader = new TileLoader({
      tileSize: this.options.tileSize,
      maxZoom: this.options.maxZoom,
      minZoom: this.options.minZoom,
      provider: this.provider,
      map: map
    })
    this.tileLoader.loadTiles()
    this._tileContainer.setAttribute('class', 'leaflet-zoom-animated leaflet-tile-container')
    this._bgBuffer.setAttribute('class', 'leaflet-zoom-animated leaflet-tile-container')
    this._container.style.paintOrder = 'stroke'
    this.tileLoader.on('tileAdded', this._renderTile, this)
    this.tileLoader.on('tileRemoved', this._clearTile, this)
    this.tileLoader.on('tilesLoaded', function () {
      this._setBoundingBox()
      this.fire('featuresChanged', this.getFeatures())
    }, this)
    this._map.on({
      'zoomanim': this._animateZoom,
      'zoomend': this._endZoomAnim,
      'moveend': this._setBoundingBox
    }, this)
  },

  onRemove: function (map) {
    this.tileLoader.unbindAndClearTiles()
  },

  addTo: function (map) {
    map.addLayer(this)
    return this
  },

  _setBoundingBox: function () {
    var visible = this._getVisibleTiles()
    this.renderers.forEach(function (renderer) {
      renderer.filter.setBoundingBox(visible)
    })
  },

  _resetRenderers: function () {
    var self = this
    if (this.renderers.length > 0) {
      this.renderers = []
    }
    var styles = this.options.styles
    if (styles.length > 0) {
      for (var i = 0; i < styles.length; i++) {
        this.renderers.push(new Renderer({
          cartocss: styles[i],
          index: i,
          layer: this
        }))
      }
    } else {
      this.renderers.push(new Renderer({
        cartocss: '',
        index: 0,
        layer: this
      }))
    }
    for (var tileKey in this.svgTiles) {
      var split = tileKey.split(':')
      var tilePoint = {
        x: parseInt(split[0], 10),
        y: parseInt(split[1], 10),
        zoom: parseInt(split[2], 10)
      }
      this.tileLoader._loadTile(tilePoint)
    }
    this.renderers.forEach(function (r) {
      r.filter.on('filterApplied', function () {
        self.fire('featuresChanged', self.getFeatures())
      })
      for (var key in self.eventCallbacks) {
        r.on(key, self.eventCallbacks[key])
      }
    })
  },

  _renderTile: function (data) {
    var tilePoint = data.tilePoint
    var geometry = data.geometry
    var self = this
    var tileKey = tilePoint.x + ':' + tilePoint.y + ':' + tilePoint.zoom
    var tile = this.svgTiles[tileKey]
    if (!tile) {
      tile = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      // tile.style.padding = this.options.tileBuffer + 'px'
      // tile.style.margin = '-' + this.options.tileBuffer + 'px'
      tile.setAttribute('class', 'leaflet-tile')
      this.svgTiles[tileKey] = tile
      this._tileContainer.appendChild(tile)
    }

    for (var i = 0; i < self.renderers.length; i++) {
      if (geometry.features.length > 1 && geometry.features[0].type === 'FeatureCollection') { // This means there's more than one layer
        if (geometry.features.length !== this.renderers.length) return
      } else {
        if (this.renderers.length > 1) return
      }
      var collection = self.renderers.length > 1 ? geometry.features[i] : geometry
      self.renderers[i].render(tile, collection, tilePoint)
    }

    var tilePos = this._getTilePos(tilePoint)
    tile.style.width = tile.style.height = this._getTileSize() + 'px'
    L.DomUtil.setPosition(tile, tilePos, L.Browser.chrome)
  },

  _clearTile: function (data) {
    var split = data.tileKey.split(':')
    var tilePoint = {x: split[0], y: split[1], zoom: split[2]}
    this.renderers.forEach(function (r) {
      r.filter.removeTile(tilePoint)
    })
    if (this.svgTiles[data.tileKey].parentNode === this._tileContainer) {
      this._tileContainer.removeChild(this.svgTiles[data.tileKey])
    }
    delete this.svgTiles[data.tileKey]
  },

  _getTilePos: function (tilePoint) {
    tilePoint = new L.Point(tilePoint.x, tilePoint.y)
    var origin = this._map.getPixelOrigin()
    var tileSize = this._getTileSize()

    return tilePoint.multiplyBy(tileSize).subtract(origin)
  },

  latLngToLayerPoint: function (lat, lng) {
    return this._map.latLngToLayerPoint(new L.LatLng(lat, lng))
  },

  _getTileSize: function () {
    var map = this._map
    var zoom = map.getZoom() + this.options.zoomOffset
    var zoomN = this.options.maxNativeZoom
    var tileSize = this.options.tileSize

    if (zoomN && zoom > zoomN) {
      tileSize = Math.round(map.getZoomScale(zoom) / map.getZoomScale(zoomN) * tileSize)
    }

    return tileSize
  },

  setCartoCSS: function (index, cartocss) {
    this.options.styles[index] = cartocss
    var transition = arguments[2]
    this.renderers[index].setCartoCSS(cartocss, transition)
  },

  _getLoadedTilesPercentage: function (container) {
    var tiles = container.getElementsByTagName('svg')
    var i, len
    var count = 0

    for (i = 0, len = tiles.length; i < len; i++) {
      if (tiles[i].complete) {
        count++
      }
    }
    return count / len
  },

  _endZoomAnim: function () {
    var front = this._tileContainer
    var bg = this._bgBuffer
    front.style.visibility = ''
    front.parentNode.appendChild(front) // Bring to fore
    bg.style.transform = ''
    bg.innerHTML = ''
    // force reflow
    L.Util.falseFn(bg.offsetWidth)

    this._animating = false
  },

  _stopLoadingImages: function (container) {
    var tiles = Array.prototype.slice.call(container.getElementsByTagName('svg'))
    var i, len, tile
    this.tileLoader._tilesLoading = {}
    for (i = 0, len = tiles.length; i < len; i++) {
      tile = tiles[i]
      tile.parentNode.removeChild(tile)
    }
    this.provider.abortPending()
  }
})

},{"./geo":4,"./providers":8,"./renderer":12,"./tileloader":13}],7:[function(require,module,exports){
(function (global){
var d3 = require('d3')

// http://bl.ocks.org/tmcw/4494715
module.exports.jsonp = function (url, callback) {
  function rand () {
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
    var c = ''
    var i = -1
    while (++i < 15) c += chars.charAt(Math.floor(Math.random() * 52))
    return c
  }

  function create (url) {
    var e = url.match(/callback=(\w+)/)
    var c = e ? e[1] : rand()
    window[c] = function (data) {
      callback(data)
      delete window[c]
      script.remove()
    }
    return c
  }

  var cb = create(url)
  var script = d3.select('head')
      .append('script')
      .attr('type', 'text/javascript')
      .attr('src', url.replace(/(\{|%7B)callback(\{|%7D)/, cb))
}

module.exports.get = function get (url, callback, options) {
  options = options || {
    method: 'GET',
    data: null,
    responseType: 'text'
  }
  var Request = window.XMLHttpRequest
  // from d3.js
  if (global.XDomainRequest &&
    !('withCredentials' in Request) &&
    /^(http(s)?:)?\/\//.test(url)) Request = global.XDomainRequest

  var req = new Request()
  req.open(options.method, url, true)

  function respond () {
    var status = req.status
    var r = options.responseType === 'arraybuffer' ? req.response : req.responseText
    if (!status && r || status >= 200 && status < 300 || status === 304) {
      callback(req)
    } else {
      callback(null)
    }
  }

  'onload' in req
    ? req.onload = req.onerror = respond
    : req.onreadystatechange = function () { req.readyState > 3 && respond() }

  req.onprogress = function () {}

  req.responseType = options.responseType // 'arraybuffer'
  if (options.data) {
    req.setRequestHeader('Content-type', 'application/json')
    // req.setRequestHeader("Content-type", "application/x-www-form-urlencoded")
    req.setRequestHeader('Accept', '*')
  }
  req.send(options.data)
  return req
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"d3":undefined}],8:[function(require,module,exports){
module.exports = {
  SQLProvider: require('./sql.js'),
  XYZProvider: require('./xyz.js'),
  WindshaftProvider: require('./windshaft.js')
}

},{"./sql.js":9,"./windshaft.js":10,"./xyz.js":11}],9:[function(require,module,exports){
var d3 = require('d3')
var geo = require('../geo')

function SQLProvider (options) {
  this.sql_api_template = options.sql_api_template || 'http://{user}.cartodb.com'
  this.user = options.user
  this.table = options.table
  this.format = options.format
  this.tileCache = {}
}

SQLProvider.prototype = {
  getTile: function (tilePoint, callback) {
    var tileData = this.tileCache[tilePoint.zoom + ':' + tilePoint.x + ':' + tilePoint.y]
    if (tileData) {
      callback(tilePoint, tileData)
    } else {
      var tileBB = {
        n: geo.tile2lat(tilePoint.y, tilePoint.zoom),
        s: geo.tile2lat(tilePoint.y + 1, tilePoint.zoom),
        e: geo.tile2lon(tilePoint.x, tilePoint.zoom),
        w: geo.tile2lon(tilePoint.x + 1, tilePoint.zoom)
      }
      var query = 'SELECT * FROM ' + this.table
      query += ' WHERE the_geom && ST_MakeEnvelope({w},{s},{e},{n}, 4326)'
      query = query
      .replace('{w}', tileBB.w)
      .replace('{s}', tileBB.s)
      .replace('{e}', tileBB.e)
      .replace('{n}', tileBB.n)

      this.getGeometry(query, tilePoint.zoom, function (geometry) {
        this.tileCache[tilePoint.zoom + ':' + tilePoint.x + ':' + tilePoint.y] = geometry
        callback(tilePoint, geometry)
      }.bind(this))
    }
  },

  _query: function (sql, callback, format) {
    var url = this.sql_api_template.replace('{user}', this.user)
    url += '/api/v2/sql?q=' + encodeURIComponent(sql)
    if (format) {
      url += '&format=' + format
    }
    d3.json(url, callback)
  },

  getGeometry: function (sql, zoom, callback) {
    // request the schema fist to extract columns and generate the final
    // sql query with the right the_geom simplification for the zoom level.
    // The current zoom level may not the best but good enough for a test
    var schemaSQL = 'select * from (' + sql + ') __cdb limit 0'
    this._query(schemaSQL, function (data) {
      // generate the final sql. Ideally only variables used in cartocss
      // should be requested
      var columns = Object.keys(data.fields).filter(function (f) {
        return f !== 'the_geom' && f !== 'the_geom_webmercator'
      })

      // pixel size with some factor to avoid remove geometries
      var px = this.pixelSizeForZoom(zoom)
      var the_geom = 'st_transform(st_simplify(st_snaptogrid(the_geom_webmercator, {px}, {px}), {px}/2), 3857) as the_geom'.replace(/{px}/g, px)
      // generate the sql with all the columns + the geometry simplified
      var finalSQL = 'select ' + columns.join(',') + ',' + the_geom + ' FROM (' + sql + ') __cdb'

      this._query(finalSQL, function (collection) {
        collection.features = collection.features.filter(function (d) {
          return d.geometry && d.geometry.coordinates.length > 0
        })
        callback(collection)
      }, 'geojson')
    }.bind(this))
  },

  pixelSizeForZoom: function (zoom) {
    var earth_circumference = 40075017
    var tile_size = 256
    var full_resolution = earth_circumference / tile_size
    return full_resolution / Math.pow(2, zoom)
  },
  invalidateCache: function () {
    this.tileCache = {}
  }
}

module.exports = SQLProvider

},{"../geo":4,"d3":undefined}],10:[function(require,module,exports){
var cartodb = require('../')
var XYZProvider = require('./xyz.js')

function WindshaftProvider (options) {
  this.tiler_template = options.tiler_template || 'http://{user}.cartodb.com'
  this.user = options.user
  this.layers = options.layers;
  this.format = options.format
  this.options = options
  this._tileQueue = []
  this.initialize(options)
  this._ready = false
  this.requests = {}
}

cartodb.d3.extend(WindshaftProvider.prototype, cartodb.d3.Event, {

  initialize: function (options) {
    this.options = options;
    this.tiler_template = this.tiler_template.replace('{user}', this.user)
    var mapconfig = this._generateMapconfig(this.table)
    var url = this.tiler_template + '/api/v1/map?config=' + encodeURIComponent(JSON.stringify(mapconfig))
    cartodb.d3.net.jsonp(url + '&callback=mapconfig', function (data) {
      this.layergroup = data
      this._ready = true
      this.urlTemplate = this.tiler_template + '/api/v1/map/' + this.layergroup.layergroupid + '/mapnik/{z}/{x}/{y}.geojson'
      XYZProvider.prototype._processQueue.apply(this)
      this.fire('ready')
    }.bind(this))
  },

  getTile: XYZProvider.prototype.getTile,

  getGeometry: XYZProvider.prototype.getGeometry,

  abortPending: XYZProvider.prototype.abortPending,

  allTilesLoaded: XYZProvider.prototype.allTilesLoaded,

  _generateMapconfig: function (table) {
    var self = this;
    var mapconfig = {
      'version': '1.0.1',
      'layers': this.layers.map(function(layer) {
         var layerOptions =  {
           'type': 'cartodb',
           'options': {
             'sql': layer.sql,
             'cartocss': layer.cartocss,
             'cartocss_version': '2.1.1'
           }
         }
         if (self.options.columns) {
          layerOptions.options.columns = self.options.columns
         }
         return layerOptions
      })
    };
    return mapconfig
  }
})

module.exports = WindshaftProvider

},{"../":5,"./xyz.js":11}],11:[function(require,module,exports){
var d3 = require('d3')
var cartodb = require('../')

function XYZProvider (options) {
  this.format = options.format
  this.urlTemplate = options.urlTemplate
  this.tilejson = options.tilejson
  this._tileQueue = []
  this._ready = false
  this.requests = {}
  if (!this.urlTemplate) {
    if (this.tilejson) {
      this.urlTemplate = this.tilejson.tiles[0]
      this._setReady()
    }
  } else {
    this._setReady()
  }
}

cartodb.d3.extend(XYZProvider.prototype, cartodb.d3.Event, {

  getTile: function (tilePoint, callback) {
    if (this._ready) {
      var self = this
      this.getGeometry(tilePoint, function (err, geometry) {
        if (err) return
        self.requests[[tilePoint.x, tilePoint.y, tilePoint.zoom].join(':')].complete = true
        callback(tilePoint, geometry)
      })
    } else {
      this._tileQueue.push([tilePoint, callback])
    }
  },

  getGeometry: function (tilePoint, callback) {
    var self = this
    var url = this.urlTemplate
      .replace('{x}', tilePoint.x)
      .replace('{y}', tilePoint.y)
      .replace('{z}', tilePoint.zoom)
      .replace('{s}', 'abcd'[(tilePoint.x * tilePoint.y) % 4])
      .replace('.png', '.geojson')
    var tilePointString = [tilePoint.x, tilePoint.y, tilePoint.zoom].join(':')
    var request = d3.json(url, callback)
    this.requests[tilePointString] = request
  },

  _setReady: function () {
    this._ready = true
    window.setTimeout(function () {
      this.fire('ready')
      this._processQueue()
    }.bind(this), 0)
  },

  setURL: function (url) {
    this.urlTemplate = url
    this._setReady()
  },

  abortPending: function () {
    for (var tileKey in this.requests) {
      this.requests[tileKey].abort()
    }
    this.requests = {}
  },

  allTilesLoaded: function () {
    for (var request in this.requests) {
      if (!this.requests[request].complete) return false
    }
    return true
  },

  _processQueue: function () {
    var self = this
    this._tileQueue.forEach(function (item) {
      self.getTile.apply(self, item)
    })
  }
})

module.exports = XYZProvider

},{"../":5,"d3":undefined}],12:[function(require,module,exports){
(function (global){
/** global L **/
var d3 = global.d3 || require('d3')
var cartodb = global.cartodb || {}
var carto = global.carto || require('carto')
var _ = global._ || require('underscore')
var geo = require('./geo')
var Filter = require('./filter')
var turboCarto = require('turbo-carto')
var Datasource = require('./datasource')

cartodb.d3 = d3 || {}

d3.selection.prototype.moveToFront = function () {
  return this.each(function () {
    this.parentNode.appendChild(this)
  })
}

var Renderer = function (options) {
  this.options = options
  this.idField = options.idField || 'cartodb_id'
  this.index = options.index
  this.filter = new Filter({ idField: this.idField })
  this.styleHistory = []
  if (options.cartocss) {
    this.setCartoCSS(options.cartocss)
  }
  this.globalVariables = {}
  this.layer = options.layer
  this.geometries = {}
}

Renderer.prototype = {
  events: {
    featureOver: null,
    featureOut: null,
    featureClick: null
  },

  /**
   * changes a global variable in cartocss
   * it can be used in cartocss in this way:
   * [prop < global.variableName] {...}
   *
   * this function can be used passing an object with all the variables or just key value:
   * layer.setGlobal('test', 1)
   * layer.setGlobal({test: 1, bar: 3})
   *
   * layer will be refreshed after calling it
   */
  setGlobal: function () {
    var args = Array.prototype.slice.call(arguments)
    if (args.length === 2) {
      this.globalVariables[args[0]] = args[1]
    } else {
      this.globalVariables = args[0]
    }
  },

  setCartoCSS: function (cartocss, transition) {
    var self = this
    if (!this.layer || !this.layer.tileLoader || !_.isEmpty(this.layer.tileLoader._tilesLoading)) {
      this.filter.on('featuresChanged', function () {
        self._setTurboCarto(cartocss, transition)
      })
    } else {
      self._setTurboCarto(cartocss, transition);
    }
  },

  _setTurboCarto: function (cartocss, transition) {
    this._preprocessCartoCSS(cartocss, function (err, parsedCartoCSS) {
      if (err) {
        console.error(err.message)
        throw err
      }
      this._applyStyle(parsedCartoCSS, transition)
    }.bind(this))
  },

  _applyStyle: function (cartocss, transition) {
    this._addStyleToHistory(cartocss)
    this.renderer = new carto.RendererJS()
    cartocss = Renderer.cleanCSS(cartocss)
    this.shader = this.renderer.render(cartocss)
    if (this.layer) {
      for (var tileKey in this.layer.svgTiles) {
        var tilePoint = tileKey.split(':')
        tilePoint = {x: tilePoint[0], y: tilePoint[1], zoom: tilePoint[2]}
        this.render(this.layer.svgTiles[tileKey], null, tilePoint, false, transition)
      }
    }
  },

  _addStyleToHistory: function (cartocss) {
    if (this.styleHistory[this.styleHistory.length - 1] !== cartocss) {
      this.styleHistory.push(cartocss)
    }
  },

  restoreCartoCSS: function (transition) {
    this.setCartoCSS(this.styleHistory[0], transition)
  },

  _preprocessCartoCSS: function (cartocss, callback) {
    var datasource = new Datasource(this.filter)
    turboCarto(cartocss, datasource, callback)
  },

  on: function (eventName, callback) {
    var self = this
    if (eventName === 'featureOver') {
      this.events.featureOver = function (f) {
        this.style.cursor = 'pointer'
        var selection = d3.select(this)
        var properties = selection.data()[0].properties
        var index = Renderer.getIndexFromFeature(this)
        var layerPoint = self._getLayerPointFromEvent(self.layer._map, f)
        var latLng = self.layer._map.layerPointToLatLng(layerPoint)
        var pos = self.layer._map.layerPointToContainerPoint(layerPoint)
        self.layer.eventCallbacks.featureOver(f, [ latLng.lat, latLng.lng ], pos, properties, index)
      }
    } else if (eventName === 'featureOut') {
      this.events.featureOut = function (f) {
        var selection = d3.select(this)
        var properties = selection.data()[0].properties
        var sym = this.attributes['class'].value
        selection.reset = function () {
          selection.style(self.styleForSymbolizer(sym, 'shader'))
        }
        var index = Renderer.getIndexFromFeature(this)
        var layerPoint = self._getLayerPointFromEvent(self.layer._map, f)
        var latLng = self.layer._map.layerPointToLatLng(layerPoint)
        var pos = self.layer._map.layerPointToContainerPoint(layerPoint)
        self.layer.eventCallbacks.featureOut(f, [ latLng.lat, latLng.lng ], pos, properties, index)
      }
    } else if (eventName === 'featureClick') {
      this.events.featureClick = function (f) {
        var selection = d3.select(this)
        var properties = selection.data()[0].properties
        var index = Renderer.getIndexFromFeature(this)
        var layerPoint = self._getLayerPointFromEvent(self.layer._map, f)
        var latLng = self.layer._map.layerPointToLatLng(layerPoint)
        var pos = self.layer._map.layerPointToContainerPoint(layerPoint)
        self.layer.eventCallbacks.featureClick(f, [ latLng.lat, latLng.lng ], pos, properties, index)
      }
    } else if (eventName === 'featuresChanged') {
      this.filter.on('featuresChanged', callback)
    }
  },

  inferGeometryType: function () {
    return this.filter.surveyRandom(5, function (f) {
      if (f.type === 'Point' || f.geometry.type === 'Point') return 'marker'
      else if (f.geometry.type.toLowerCase().indexOf('polygon') > -1) return 'polygon'
      else if (f.geometry.type.toLowerCase().indexOf('line') > -1) return 'line'
    })[0]
  },

  _getLayerPointFromEvent: function (map, event) {
    var curleft = 0
    var curtop = 0
    var obj = map.getContainer()

    var x, y
    if (event.changedTouches && event.changedTouches.length > 0) {
      x = event.changedTouches[0].clientX + window.scrollX
      y = event.changedTouches[0].clientY + window.scrollY
    } else {
      x = event.clientX
      y = event.clientY
    }

    var pointX
    var pointY
    // If the map is fixed at the top of the window, we can't use offsetParent
    // cause there might be some scrolling that we need to take into account.
    if (obj.offsetParent && obj.offsetTop > 0) {
      do {
        curleft += obj.offsetLeft
        curtop += obj.offsetTop
      } while (obj = obj.offsetParent)  // eslint-disable-line
      pointX = x - curleft
      pointY = y - curtop
    } else {
      var rect = obj.getBoundingClientRect()
      var scrollX = (window.scrollX || window.pageXOffset)
      var scrollY = (window.scrollY || window.pageYOffset)
      pointX = (event.clientX ? event.clientX : x) - rect.left - obj.clientLeft - scrollX
      pointY = (event.clientY ? event.clientY : y) - rect.top - obj.clientTop - scrollY
    }
    var point = new window.L.Point(pointX, pointY)
    return map.containerPointToLayerPoint(point)
  },

  redraw: function (updating) {
    if (this.layer) {
      for (var tileKey in this.layer.svgTiles) {
        var tilePoint = tileKey.split(':')
        this.layer.svgTiles[tileKey].children[this.index].innerHTML = ''
        tilePoint = {x: tilePoint[0], y: tilePoint[1], zoom: tilePoint[2]}
        this.render(this.layer.svgTiles[tileKey], null, tilePoint, false)
      }
    }
  },

  // there are special rules for layers, for example "::hover", this function
  // search for them and attach to the original layer, so if you have
  // #test {}
  // #test::hover {}
  // this function will return an array with a single layer. That layer will contain a
  // hover as an attribute
  processLayersRules: function (layers) {
    var specialAttachments = ['hover']
    var realLayers = []
    var attachments = []
    // map layer names
    var layerByName = {}
    layers.forEach(function (layer) {
      if (specialAttachments.indexOf(layer.attachment()) !== -1) {
        attachments.push(layer)
      } else {
        layerByName[layer.name()] = layer
        realLayers.push(layer)
      }
    })

    // link attachment with layers
    attachments.forEach(function (attachment) {
      var n = layerByName[attachment.name()]
      if (n) {
        n[attachment.attachment()] = attachment
      } else {
        console.log('attachment without layer')
      }
    })

    return realLayers
  },

  styleForSymbolizer: function (symbolyzer, shaderName) {
    if (symbolyzer === 'polygon' || symbolyzer === 'line') {
      return {
        'fill': function (d) { 
          return d[shaderName]['polygon-fill'] || 'none' 
        },
        'fill-opacity': function (d) { 
          return d[shaderName]['polygon-opacity'] 
        },
        'stroke': function (d) { 
          return d[shaderName]['line-color'] 
        },
        'stroke-width': function (d) { 
          return d[shaderName]['line-width'] 
        },
        'stroke-opacity': function (d) { 
          return d[shaderName]['line-opacity'] 
        },
        'mix-blend-mode': function (d) { 
          var geometryType = 'marker';
          if (d.geometry.type.toLowerCase().indexOf('line') > -1) geometryType = 'line';
          else if (d.geometry.type.toLowerCase().indexOf('polygon') > -1) geometryType = 'polygon';
          return d[shaderName]['comp-op'] || d[shaderName][geometryType + '-comp-op'] 
        },
        'stroke-dasharray': function (d) { 
          return d[shaderName]['line-dasharray']
           }
      }
    } else if (symbolyzer === 'markers') {
      return {
        'fill': function (d) { 
          return d[shaderName]['marker-fill'] || 'none' 
        },
        'fill-opacity': function (d) { 
          return d[shaderName]['marker-fill-opacity'] 
        },
        'stroke': function (d) { 
          return d[shaderName]['marker-line-color'] 
        },
        'stroke-opacity': function (d) { 
          return d[shaderName]['marker-line-opacity'] 
        },
        'stroke-width': function (d) { 
          return d[shaderName]['marker-line-width'] 
        },
        'radius': function (d) {
          return d[shaderName]['marker-width'] / 2
        },
        'mix-blend-mode': function (d) { 
          return d[shaderName]['comp-op'] || d[shaderName]['marker-comp-op']
        },
        'stroke-dasharray': function (d) { 
          return d[shaderName]['line-dasharray']
           }
      }
    } else if (symbolyzer === 'text') {
      return {
        'fill': function (d) { 
          return d[shaderName]['text-fill'] || 'none' 
        },
        'mix-blend-mode': function (d) { 
          return d[shaderName]['comp-op'] || d[shaderName]['text-comp-op']
           }
      }
    }
  },

  generateProjection: function (tilePoint) {
    var corrected_x = geo.wrapX(tilePoint.x, tilePoint.zoom)
    return function (x, y) {
      var earthRadius = 6378137 * 2 * Math.PI
      var earthRadius2 = earthRadius / 2
      var invEarth = 1.0 / earthRadius
      var pixelScale = 256 * (1 << tilePoint.zoom)
      x = pixelScale * (x + earthRadius2) * invEarth
      y = pixelScale * (-y + earthRadius2) * invEarth
      if (this.stream) {
        this.stream.point(x - corrected_x * 256, y - tilePoint.y * 256)
      } else {
        return { x: x - corrected_x * 256, y: y - tilePoint.y * 256 }
      }
    }
  },

  render: function (svg, collection, tilePoint, updating, transition) {
    var self = this
    collection = this.filter.addTile(tilePoint, collection) // It won't add duplicates
    var g
    var svgSel = d3.select(svg)
    if (svg.children[this.index]) {
      g = d3.select(svg.children[this.index])
    } else {
      g = svgSel.append('g')
    }
    this.projection = this.generateProjection(tilePoint)
    this.path = d3.geo.path().projection(d3.geo.transform({ point: this.projection }))

    if (!this.shader || !collection || collection.features.length === 0) return
    var layers = this.shader.getLayers()

    // search for hovers and other special rules for the renderer
    layers = this.processLayersRules(layers)
    layers.forEach(function (layer, i) {
      if (layer.shader.attachment === 'Map::__default__') return;
      var thisGroup
      var children = g[0][0].children
      if (!children[i]) thisGroup = g.append('g')
      else thisGroup = d3.select(children[i])
      var sym = self._getSymbolizers(layer)[0]
      var features
      if (!updating) {
        features = self._createFeatures(layer, collection, thisGroup[0][0])
      } else {
        features = thisGroup.selectAll('.' + sym)
      }
      this.tilePoint = tilePoint
      self._styleFeatures(layer, features, this, transition)
    })
    svgSel.attr('class', svgSel.attr('class') + ' leaflet-tile-loaded')
  },

  _styleFeatures: function (layer, features, group, transition) {
    var sym = this._getSymbolizers(layer)[0]
    var self = this
    features.each(function (d) {
      if (!d.properties) d.properties = {}
      var featureHash = geo.hashFeature(d.properties[self.idField], group.tilePoint)
      if (!self.geometries[featureHash]) self.geometries[featureHash] = []
      self.geometries[featureHash].push(this)
      if (d.geometry) { // Marker geometries have 'coordinates', not 'geometry'
        if (d.geometry.type === 'Polygon' || d.geometry.type === 'MultiPolygon') {
          d.properties['mapnik::geometry_type'] = Renderer.MAPNIK_GEOMETRY_TYPES.POLYGON
        } else {
          d.properties['mapnik::geometry_type'] = Renderer.MAPNIK_GEOMETRY_TYPES.LINE
        }
      } else {
        d.properties['mapnik::geometry_type'] = Renderer.MAPNIK_GEOMETRY_TYPES.POINT
      }
      d.properties.global = self.globalVariables
      d.shader = layer.getStyle(d.properties, {zoom: group.tilePoint.zoom, time: self.time})
      this.onmousemove = self.events.featureOver
      this.onmouseleave = self.events.featureOut
      this.onclick = self.events.featureClick
      if (layer.hover) {
        d.shader_hover = layer.hover.getStyle(d.properties, { zoom: group.tilePoint.zoom, time: self.time })
        _.defaults(d.shader_hover, d.shader)
        self.events.featureOver = function (f) {
          this.style.cursor = 'default'
          var element = d3.select(this).data()[0]
          var hash = geo.hashFeature(element.properties[self.idField], element.properties.tilePoint)
          self.geometries[hash].forEach(function (feature) {
            d3.select(feature).style(self.styleForSymbolizer(sym, 'shader_hover'))
          })
        }
        self.events.featureOut = function () {
          var element = d3.select(this).data()[0]
          var hash = geo.hashFeature(element.properties[self.idField], element.properties.tilePoint)
          self.geometries[hash].forEach(function (feature) {
            d3.select(feature).style(self.styleForSymbolizer(sym, 'shader'))
          })
        }
      }
    })
    if (sym === 'text') {
      features = this._transformText(features)
    }
    this._getSymbolizers(layer).forEach(function (sym) {
      var style = self.styleForSymbolizer(sym, 'shader')
      var delays = {}
      if (transition) {
        features.filter(sym === 'markers' ? 'circle' : 'path').transition().duration(500).delay(function (f) {
            return Math.floor(Math.random() * 500)
        }).style(style).attr('r', style.radius)
      } else { 
        features.filter(sym === 'markers' ? 'circle' : 'path').style(style).attr('r', style.radius)
      }
    })
  },

  _createFeatures: function (layer, collection, group) {
    var self = this
    var sym = this._getSymbolizers(layer)[0]
    var geometry = collection.features
    var transform = transformForSymbolizer(sym)
    if (transform) {
      geometry = geometry.map(transform)
    }

    // select based on symbolizer
    var features = d3.select(group)
      .selectAll('.' + sym)
      .data(geometry)

    if (sym === 'text') {
      features.enter().append('svg:text').attr('class', sym)
    } else {
      features.enter().append(function (f) {
        return document.createElementNS('http://www.w3.org/2000/svg', {
          'Feature': 'path',
          'Point': 'circle'
        }[f.type])
      }).each(function (f) {
        var selection = d3.select(this)
        if (f.type === 'Feature') {
          selection.attr('class', sym).attr('d', self.path)
        } else {
          if (f.coordinates[0]) {
            var coords = self.projection.apply(this, f.coordinates)
            selection.attr('class', 'markers').attr('cx', coords.x).attr('cy', coords.y)
          }
        }
      })
    }
    features.exit().remove()
    return features
  },

  _getSymbolizers: function (layer) {
    var symbolizers = layer.getSymbolizers()
    symbolizers = _.filter(symbolizers, function (f) {
      return f !== '*'
    })
    // merge line and polygon symbolizers
    symbolizers = _.uniq(symbolizers.map(function (d) { return d === 'line' ? 'polygon' : d }))
    return symbolizers
  },

  _transformText: function (feature) {
    var self = this
    feature.text(function (d) {
      return d.shader['text-name']
    })
    feature.attr('dy', function (d) {
      return d.shader['text-dy']
    })
    feature.attr('text-anchor', 'middle')
    feature.attr('x', function (d) {
      if (d.geometry.coordinates[0]) {
        var p = self.projection(d.geometry.coordinates[0], d.geometry.coordinates[1])
        return p.x
      } else {
        this.remove()
      }
    })
    feature.attr('y', function (d) {
      if (d.geometry.coordinates[0]) {
        var p = self.projection(d.geometry.coordinates[0], d.geometry.coordinates[1])
        return p.y
      } else {
        this.remove()
      }
    })
    return feature
  }
}

Renderer.MAPNIK_GEOMETRY_TYPES = {
  POLYGON: 3,
  LINE: 2,
  POINT: 1
}

Renderer.getIndexFromFeature = function (element) {
  var i = 0
  var node = element.parentElement.parentElement
  while (node = node.previousSibling) i++ // eslint-disable-line
  return i
}

Renderer.isTurboCarto = function (cartocss) {
  var reservedWords = ['ramp', 'colorbrewer', 'buckets']
  var isTurbo = reservedWords
    .map(function (w) {
      return w + '('
    })
    .map(String.prototype.indexOf.bind(cartocss))
    .every(function (f) { return f === -1 })
  return isTurbo
}

Renderer.cleanCSS = function (cartocss) {
  return cartocss.replace(/\#[^\n;:}]*?[\{[]/g, function (f) { 
    return f.replace(f.replace("#","").replace("{","").replace("[","").trim(), "layer")
  })
}

function transformForSymbolizer (symbolizer) {
  if (symbolizer === 'markers' || symbolizer === 'labels') {
    var pathC = d3.geo.path().projection(function (d) { return d })
    return function (d) {
      if (d.geometry.type === 'Point') {
        return d._centroid || (d._centroid = {
          type: 'Point',
          properties: d.properties,
          coordinates: pathC.centroid(d)
        })
      } else {
        return d
      }
    }
  }
  return null
}

module.exports = Renderer

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./datasource":2,"./filter":3,"./geo":4,"carto":undefined,"d3":undefined,"turbo-carto":undefined,"underscore":undefined}],13:[function(require,module,exports){
var L = window.L

module.exports = L.Class.extend({
  includes: L.Mixin.Events,

  initialize: function (options) {
    this.options = options
    this.provider = options.provider
    this._map = options.map
    this._tiles = {}
    this._tilesLoading = {}
    this._tilesToLoad = 0
    this.lastDrag = 0
    this._map.on('moveend', this._reloadTiles, this)
    // this._map.on('drag', function () {
    //   if ((this.dragging._lastTime - self.lastDrag) > 500) {
    //     self.lastDrag = this.dragging._lastTime
    //     self._reloadTiles()
    //   }
    // })
  },

  loadTiles: function () {
    this._reloadTiles()
  },

  _reloadTiles: function () {
    if (!this._map) {
      return
    }

    var bounds = this._map.getPixelBounds()
    var zoom = this._map.getZoom()
    var tileSize = this.options.tileSize

    if (zoom > this.options.maxZoom || zoom < this.options.minZoom) {
      return
    }

    var nwTilePoint = new L.Point(
      Math.floor(bounds.min.x / tileSize),
      Math.floor(bounds.min.y / tileSize)
    )
    var seTilePoint = new L.Point(
      Math.floor(bounds.max.x / tileSize),
      Math.floor(bounds.max.y / tileSize)
    )
    var tileBounds = new L.Bounds(nwTilePoint, seTilePoint)

    this._addTilesFromCenterOut(tileBounds)
    this._removeOtherTiles(tileBounds)
  },

  _addTilesFromCenterOut: function (bounds) {
    var queue = []
    var center = bounds.getCenter()
    var zoom = this._map.getZoom()

    var j, i, point

    for (j = bounds.min.y; j <= bounds.max.y; j++) {
      for (i = bounds.min.x; i <= bounds.max.x; i++) {
        point = new L.Point(i, j)
        point.zoom = zoom
        if (this._tileShouldBeLoaded(point)) {
          queue.push(point)
        }
      }
    }

    var tilesToLoad = queue.length

    if (tilesToLoad === 0) {
      return
    }

    // load tiles in order of their distance to center
    queue.sort(function (a, b) {
      return a.distanceTo(center) - b.distanceTo(center)
    })

    this._tilesToLoad += tilesToLoad

    for (i = 0; i < tilesToLoad; i++) {
      this._loadTile(queue[i])
    }
    this.fire('tilesLoading')
  },

  _loadTile: function (tilePoint) {
    var tileKey = this._tileKey(tilePoint)
    this._tilesLoading[tileKey] = tilePoint
    this.provider.getTile(tilePoint, function (tilePoint, geometry) {
      if (tilePoint.zoom !== this._map.getZoom()) return
      this._tiles[tileKey] = true
      delete this._tilesLoading[tileKey]
      this._tilesToLoad--
      this.fire('tileAdded', {tilePoint: tilePoint, geometry: geometry})
      if (this.provider.allTilesLoaded()) {
        this.fire('tilesLoaded')
      }
    }.bind(this))
  },

  _removeOtherTiles: function (bounds) {
    var kArr, x, y, z, key
    var zoom = this._map.getZoom()

    for (key in this._tiles) {
      if (this._tiles.hasOwnProperty(key)) {
        kArr = key.split(':')
        x = parseInt(kArr[0], 10)
        y = parseInt(kArr[1], 10)
        z = parseInt(kArr[2], 10)

        // remove tile if it's out of bounds
        if (zoom !== z || x < bounds.min.x || x > bounds.max.x || y < bounds.min.y || y > bounds.max.y) {
          this._removeTile(key)
        }
      }
    }
  },

  unbindAndClearTiles: function () {
    this._map.off('moveend', this._reloadTiles, this)
    this._map.off('zoomstart', this._invalidateProviderCache, this)
    this._removeTiles()
  },

  _removeTiles: function (bounds) {
    for (var key in this._tiles) {
      this._removeTile(key)
    }
  },

  _removeTile: function (key) {
    this.fire('tileRemoved', { tileKey: key })
    delete this._tiles[key]
    delete this._tilesLoading[key]
  },

  _tileShouldBeLoaded: function (tilePoint) {
    var k = this._tileKey(tilePoint)
    return !(k in this._tiles) && !(k in this._tilesLoading)
  },

  _tileKey: function (tilePoint) {
    return tilePoint.x + ':' + tilePoint.y + ':' + tilePoint.zoom
  }
})

},{}],14:[function(require,module,exports){
var L = window.L
var cartodb = require('../')

module.exports = {
  viz: function (url, map, done, options) {
    options = options || {};
    cartodb.d3.net.jsonp(url + '?callback=vizjson', function (data) {
      map.setView(JSON.parse(data.center), data.zoom)
      // get base layer, not render anything in case of non ZXY layers
      var baseLayer = data.layers[0]
      if (baseLayer.options.urlTemplate) {
        map.addLayer(new L.TileLayer(baseLayer.options.urlTemplate, {
          subdomains: baseLayer.options.subdomains || 'abcd'
        }))
      } else if (baseLayer.options.color) {
        document.getElementById('map').style['background-color'] = baseLayer.options.color
      }
      // assume first layer is the one with cartodb data
      var cartodbLayer = data.layers[1]
      if (cartodbLayer.type === 'layergroup') {
        var layers = cartodbLayer.options.layer_definition.layers.map(function (layer) {
          return {
            // fix the \n in sql
            sql: layer.options.sql.replace(/\n/g, ' '),
            cartocss: layer.options.cartocss,
          }
        })

        var lyr = new L.CartoDBd3Layer({
          user: cartodbLayer.options.user_name,
          layers: layers,
          styles: layers.map(function (l) { return l.cartocss }),
          columns: options.columns
        }).addTo(map)

        done(null, lyr, layers)
      } else {
        done(new Error('named maps not supported'))
      }
    })
  }
}

},{"../":5}]},{},[5])(5)
});