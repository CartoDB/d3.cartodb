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
    if (typeof feature.geometry.coordinates[0] === 'number') {
      return this.pointInBB(boundingBox, feature.geometry.coordinates)
    } else if (feature.geometry.type === 'MultiLineString' || feature.geometry.type === 'MultiPolygon') {
      var geometries = feature.geometry.coordinates
      for (var multipoly = 0; multipoly < geometries.length; multipoly++) {
        for (var poly = 0; poly < geometries[multipoly].length; poly++) {
          return this.anyPointInBB(boundingBox,geometries[multipoly][poly])
        }
      }
    } else if (feature.geometry.type === 'LineString' || feature.geometry.type === 'Polygon') {
      return this.anyPointInBB(boundingBox, feature.geometry.coordinates)
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
