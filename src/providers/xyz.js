var d3 = require('d3')
var topojson = require('topojson')
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
        if (geometry.type === 'Topology') {
          self.format = 'topojson'
          geometry = topojson.feature(geometry, geometry.objects.vectile)
        }
        callback(tilePoint, geometry)
      })
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

    this.requests[[tilePoint.x, tilePoint.y, tilePoint.zoom].join(':')] = d3.json(url, callback)
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

  _processQueue: function () {
    var self = this
    this._tileQueue.forEach(function (item) {
      self.getTile.apply(self, item)
    })
  }
})

module.exports = XYZProvider
