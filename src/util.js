var L = window.L
var cartodb = require('../')

module.exports = {
  viz: function (url, map, done) {
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
            cartocss: layer.options.cartocss
          }
        })

        var lyr = new L.CartoDBd3Layer({
          user: cartodbLayer.options.user_name,
          layers: layers,
          styles: layers.map(function (l) { return l.cartocss })
        }).addTo(map)

        done(null, lyr, layers)
      } else {
        done(new Error('named maps not supported'))
      }
    })
  }
}
