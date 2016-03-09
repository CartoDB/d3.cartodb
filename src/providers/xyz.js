var d3 = require('d3')
var topojson = require('topojson')
var cartodb = require('../')
var geo = require('../geo')

function XYZProvider (options) {
  this.format = options.format
  this.urlTemplate = options.urlTemplate
  this.tilejson = options.tilejson
  this._tileQueue = []
  this._ready = false
  this.geojsons = {}
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
        if (geometry.type === 'Topology') {
          self.format = 'topojson'
          geometry = topojson.feature(geometry, geometry.objects.vectile)
        }
        self.requests[[tilePoint.x, tilePoint.y, tilePoint.zoom].join(':')].complete = true
        self.geojsons[[tilePoint.x, tilePoint.y, tilePoint.zoom].join(':')] = geometry
        callback(tilePoint, geometry)
      })
    } else {
      this._tileQueue.push([tilePoint, callback])
    }
  },

  getGeometry: function (tilePoint, callback) {
    var self = this
    var tilePointString = [tilePoint.x, tilePoint.y, tilePoint.zoom].join(':')
    var parent = this._getTileParent(tilePoint)
    if (parent) {
      this._sliceParent(parent)
      callback(undefined, this.geojsons[tilePointString])
    } else {
      var url = this.urlTemplate
        .replace('{x}', tilePoint.x)
        .replace('{y}', tilePoint.y)
        .replace('{z}', tilePoint.zoom)
        .replace('{s}', 'abcd'[(tilePoint.x * tilePoint.y) % 4])
        .replace('.png', '.geojson')
      var request = d3.json(url, callback)
      this.requests[tilePointString] = request
    }
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
  },

  _tileParentExists: function(tilePoint) {
    var parentTilePoint = {
      x: Math.floor(tilePoint.x / 2),
      y: Math.floor(tilePoint.y / 2),
      zoom = tilePoint.zoom - 1
    }
    var tilePointString = [parentTilePoint.x, parentTilePoint.y, parentTilePoint.zoom].join(":")
    if (tilePointString in this.geojsons) {
      return parentTilePoint
    }
    return false
  }
})

module.exports = XYZProvider
