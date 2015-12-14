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
  }
}
