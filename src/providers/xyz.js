var d3 = require('d3')
var topojson = require('topojson')

function XYZProvider (options) {
  this.format = options.format
  this.tileCache = {}
  this.urlTemplate = options.urlTemplate
  this.tilejson = options.tilejson
  this._tileQueue = []
  if (!this.urlTemplate) {
    if (!this.tilejson) {
      this.ready = false
    }
    this.urlTemplate = this.tilejson.tiles[0]
  }
}

XYZProvider.prototype = {

  getTile: function (tilePoint, callback) {
    if (this.ready) {
      var self = this
      var tileKey = tilePoint.zoom + ':' + tilePoint.x + ':' + tilePoint.y
      var tileData = this.tileCache[tileKey]
      if (tileData) {
        callback(tilePoint, tileData)
      } else {
        this.getGeometry(tilePoint, function (err, geometry) {
          if (err) return
          if (geometry.type === 'Topology') {
            self.format = 'topojson'
            geometry = topojson.feature(geometry, geometry.objects.vectile)
          }
          this.tileCache[tileKey] = geometry
          callback(tilePoint, geometry)
        }.bind(this))
      }
    } else {
      this._tileQueue.push([tilePoint, callback])
    }
  },

  getGeometry: function (tilePoint, callback) {
    var url = this.urlTemplate
      .replace('{x}', tilePoint.x)
      .replace('{y}', tilePoint.y)
      .replace('{z}', tilePoint.zoom)
      .replace('{s}', 'abcd'[(tilePoint.x * tilePoint.y) % 4])
      .replace('.png', '.geojson')

    d3.json(url, callback)
  },

  invalidateCache: function () {
    this.tileCache = {}
  },

  setReady: function () {
    this._processQueue()
  },

  setURL: function (url) {
    this.urlTemplate = url
    this.setReady()
  },

  _processQueue: function () {
    var self = this
    this._tileQueue.forEach(function (item) {
      self.getTile.apply(self, item)
    })
  }
}

module.exports = XYZProvider
