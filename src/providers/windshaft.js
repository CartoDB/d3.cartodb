var cartodb = require('../')
var XYZProvider = require('./xyz.js')

function WindshaftProvider (options) {
  this.tiler_template = options.tiler_template || 'http://{user}.cartodb.com'
  this.user = options.user
  this.layers = options.layers;
  this.format = options.format
  this.options = options
  this._tileQueue = []
  this.initialize()
  this._ready = false
  this.requests = {}
}

cartodb.d3.extend(WindshaftProvider.prototype, cartodb.d3.Event, {

  initialize: function () {
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
    var mapconfig = {
      'version': '1.0.1',
      'layers': this.layers.map(function(layer) {
         return {
           'type': 'cartodb',
           'options': {
             'sql': layer.sql,
             'cartocss': layer.cartocss,
             'cartocss_version': '2.1.1'
           }
         }
      })
    };
    return mapconfig
  }
})

module.exports = WindshaftProvider
