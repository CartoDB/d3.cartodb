var d3 = require('d3')
var topojson = require('topojson')
var cartodb = require('../')
var XYZProvider = require('./xyz.js')

function WindshaftProvider (options) {
  this.tiler_template = options.tiler_template || 'http://{user}.cartodb.com'
  this.user = options.user
  this.table = options.table
  this.format = options.format
  this.options = options
  this._tileQueue = []
  this.initialize()
  this.ready = false
}

WindshaftProvider.prototype = {
  initialize: function () {
    this.tiler_template = this.tiler_template.replace('{user}', this.user)
    var mapconfig = this._generateMapconfig(this.table)
    var url = this.tiler_template + '/api/v1/map?config=' + encodeURIComponent(JSON.stringify(mapconfig))
    cartodb.d3.net.jsonp(url + '&callback=mapconfig', function (data) {
      this.layergroup = data
      this.ready = true
      this.urlTemplate = this.tiler_template + '/api/v1/map/' + this.layergroup.layergroupid + '/0/{z}/{x}/{y}.geojson'
      XYZProvider.prototype._processQueue.apply(this)
    }.bind(this))
  },

  getTile: XYZProvider.prototype.getTile,

  getGeometry: XYZProvider.prototype.getGeometry,

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
  }
}

module.exports = WindshaftProvider
