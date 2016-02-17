module.exports = {
  tile2lon: function (x, z) {
    return (x / Math.pow(2, z) * 360 - 180)
  },
  tile2lat: function (y, z) {
    var n = Math.PI - 2 * Math.PI * y / Math.pow(2, z)
    return (180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))))
  },
  geo2Webmercator: function (x_lon, y_lat) {
    if (Math.abs(x_lon) <= 180 && Math.abs(y_lat) < 90) {
      // 0.017453292519943295 => Deg to rad constant
      var num = x_lon * 0.017453292519943295
      // 6378137 => Earth radius
      var x = 6378137.0 * num
      var a = y_lat * 0.017453292519943295
      var x_mercator = x
      var y_mercator = 3189068.5 * Math.log((1.0 + Math.sin(a)) / (1.0 - Math.sin(a)))
      return {x: x_mercator, y: y_mercator}
    }
  },
  wrapX: function (x, zoom) {
    var limit_x = Math.pow(2, zoom)
    var corrected_x = ((x % limit_x) + limit_x) % limit_x
    return corrected_x
  },
  hashFeature: function (id, tilePoint) {
    var pane = Math.floor(tilePoint.x / Math.pow(2, tilePoint.zoom))
    return [id, pane].join(':')
  },
  lng2tile: function (lon,zoom) { return (Math.floor((lon+180)/360*Math.pow(2,zoom))); },
  lat2tile: function (lat,zoom) { return (Math.floor((1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2 *Math.pow(2,zoom))); },

  latLng2Tile: function (lat, lng, zoom) {
    return {x: this.lng2tile(lng, zoom),
            y: this.lat2tile(lat, zoom),
            zoom: zoom}
  }
}
