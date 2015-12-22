var d3 = require('d3')
var topojson = require('topojson')
var cartodb = require('../')

function WindshaftProvider (options) {
  this.tiler_template = options.tiler_template || 'http://{user}.cartodb.com'
  this.user = options.user
  this.table = options.table
  this.format = options.format
  this.options = options
  this.tileCache = {}
  this._tileQueue = []
  this.initialize()
}

WindshaftProvider.prototype = {
  initialize: function () {
    var self = this
    this.tiler_template = this.tiler_template.replace('{user}', this.user)
    var mapconfig = this._generateMapconfig(this.table)
    var url = this.tiler_template + '/api/v1/map?config=' + encodeURIComponent(JSON.stringify(mapconfig))
    cartodb.d3.net.jsonp(url + '&callback=mapconfig', function (data) {
      self.layergroup = data
      self.urlTemplate = self.tiler_template + '/api/v1/map/' + self.layergroup.layergroupid + '/0/{z}/{x}/{y}.geojson'
      self._processQueue()
    })
  },

  getTile: function (tilePoint, callback) {
    if (this.layergroup) {
      var self = this
      var tileData = this.tileCache[tilePoint.zoom + ':' + tilePoint.x + ':' + tilePoint.y]
      if (tileData) {
        callback(tilePoint, tileData)
      } else {
        var url = this.urlTemplate
                  .replace('{x}', tilePoint.x)
                  .replace('{y}', tilePoint.y)
                  .replace('{z}', tilePoint.zoom)
        this.getGeometry(url, function (err, geometry) {
          if (err) return
          if (geometry.type === 'Topology') {
            self.format = 'topojson'
            geometry = topojson.feature(geometry, geometry.objects.vectile)
          }
          callback(tilePoint, geometry)
        })
      }
    } else {
      this._tileQueue.push([tilePoint, callback])
    }
  },

  getGeometry: function (url, callback) {
    d3.json(url, callback)
  },

  _processQueue: function () {
    this._tileQueue.forEach(function (item) {
      this.getTile.apply(this, item)
    })
  },

  _generateMapconfig: function (table) {
    var mapconfig = {
      'version': '1.0.1',
      'layers': [
        {
          'type': 'cartodb',
          'options': {
            'sql': 'select * from ' + table,
            'cartocss': this.options.styles[0],
            'cartocss_version': '2.1.1'
          }
        }
      ]
    }
    return mapconfig
  },

  invalidateCache: function () {
    this.tileCache = {}
  }
}

module.exports = WindshaftProvider
