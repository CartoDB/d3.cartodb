var d3 = global.d3 || require('d3')
var cartodb = global.cartodb || {}
var carto = global.carto || require('carto')
var _ = global._ || require('underscore')
var geo = require('./geo')
var Filter = require('./filter')

cartodb.d3 = d3 || {}

d3.selection.prototype.moveToFront = function () {
  return this.each(function () {
    this.parentNode.appendChild(this)
  })
}

var Renderer = function (options) {
  this.options = options
  if (options.cartocss) {
    this.setCartoCSS(options.cartocss)
  }
  this.globalVariables = {}
  this.layer = options.layer
  this.filter = new Filter()
  this.dimensions = {}
}

Renderer.prototype = {
  /**
   * changes a global variable in cartocss
   * it can be used in carotcss in this way:
   * [prop < global.variableName] {...}
   *
   * this function can be used passing an object with all the variables or just key value:
   * layer.setGlobal('test', 1)
   * layer.setGlobal({test: 1, bar: 3})
   *
   * layer will be refreshed after calling it
   */
  setGlobal: function () {
    var args = Array.prototype.slice.call(arguments)
    if (args.length === 2) {
      this.globalVariables[args[0]] = args[1]
    } else {
      this.globalVariables = args[0]
    }
  },

  setCartoCSS: function (cartocss) {
    this.renderer = new carto.RendererJS()
    this.shader = this.renderer.render(cartocss)
    if (this.layer) {
      for (var tileKey in this.layer.svgTiles) {
        var tilePoint = tileKey.split(':')
        tilePoint = {x: tilePoint[0], y: tilePoint[1], zoom: tilePoint[2]}
        this.render(this.layer.svgTiles[tileKey], null, tilePoint, true)
      }
    }
  },

  redraw: function (updating) {
    if (this.layer) {
      for (var tileKey in this.layer.svgTiles) {
        var tilePoint = tileKey.split(':')
        this.layer.svgTiles[tileKey].innerHTML = ''
        tilePoint = {x: tilePoint[0], y: tilePoint[1], zoom: tilePoint[2]}
        this.render(this.layer.svgTiles[tileKey], null, tilePoint, false)
      }
    }
  },

  processLayersRules: function (layers) {
    var specialAttachments = ['hover']
    var realLayers = []
    var attachments = []
    var layerByName = {}
    layers.forEach(function (layer) {
      if (specialAttachments.indexOf(layer.attachment()) !== -1) {
        attachments.push(layer)
      } else {
        layerByName[layer.name()] = layer
        realLayers.push(layer)
      }
    })

    // link attachment with layers
    attachments.forEach(function (attachment) {
      var n = layerByName[attachment.name()]
      if (n) {
        n[attachment.attachment()] = attachment
      } else {
        console.log('attachment without layer')
      }
    })

    return realLayers
  },

  onMouseover: function (sym, path) {
    return function (d) {
      var t = d3.select(this)
      t.moveToFront()
      var trans_time = d.shader_hover['transition-time']
      if (trans_time) {
        t = t.transition().duration(trans_time)
      }
      var old = path.pointRadius()
      path.pointRadius(function (d) {
        return (d.shader_hover['marker-width'] || 0) / 2.0
      })

      t.attr('d', path)
        .style(this.styleForSymbolizer(sym, 'shader_hover'))
      path.pointRadius(old)
    }
  },

  onMouseout: function (sym, path) {
    return function (d) {
      var t = d3.select(this)
      var trans_time = d.shader_hover['transition-time']
      if (trans_time) {
        t = t.transition().duration(trans_time)
      }
      t.attr('d', path)
        .style(this.styleForSymbolizer(sym, 'shader'))
    }
  },

  styleForSymbolizer: function (symbolyzer, shaderName) {
    if (symbolyzer === 'polygon' || symbolyzer === 'line') {
      return {
        'fill': function (d) { return d[shaderName]['polygon-fill'] || 'none' },
        'fill-opacity': function (d) { return d[shaderName]['polygon-opacity'] },
        'stroke': function (d) { return d[shaderName]['line-color'] },
        'stroke-width': function (d) { return d[shaderName]['line-width'] },
        'stroke-opacity': function (d) { return d[shaderName]['line-opacity'] }
      }
    } else if (symbolyzer === 'markers') {
      return {
        'fill': function (d) { return d[shaderName]['marker-fill'] || 'none' },
        'fill-opacity': function (d) { return d[shaderName]['marker-fill-opacity'] },
        'stroke': function (d) { return d[shaderName]['marker-line-color'] },
        'stroke-width': function (d) { return d[shaderName]['marker-line-width'] }
      }
    } else if (symbolyzer === 'text') {
      return {
        'fill': function (d) { return d[shaderName]['text-fill'] || 'none' }
      }
    }
  },

  generatePath: function (tilePoint) {
    var self = this
    return d3.geo.path().projection(d3.geo.transform({
      point: function (x, y) {
        // don't use leaflet projection since it's pretty slow
        if (self.layer.provider.format === 'topojson') {
          var webm = geo.geo2Webmercator(x, y)
          x = webm.x
          y = webm.y
        }
        var earthRadius = 6378137 * 2 * Math.PI
        var earthRadius2 = earthRadius / 2
        var invEarth = 1.0 / earthRadius
        var pixelScale = 256 * (1 << tilePoint.zoom)
        x = pixelScale * (x + earthRadius2) * invEarth
        y = pixelScale * (-y + earthRadius2) * invEarth
        this.stream.point(x - tilePoint.x * 256, y - tilePoint.y * 256)
      }
    }))
  },

  render: function (svg, collection, tilePoint, updating) {
    var self = this
    collection = this.filter.addTile(tilePoint, collection) // It won't add duplicates
    var g, styleLayers
    var svgSel = d3.select(svg)
    if (updating) {
      collection = {features: d3.selectAll(svg.firstChild.children).data()}
      g = d3.select(svg.firstChild)
      styleLayers = g.data()
    } else {
      g = svgSel.append('g').attr('class', 'leaflet-zoom-hide')
    }
    this.path = this.generatePath(tilePoint)

    if (!this.shader || !collection || collection.features.length === 0) return
    var layers = this.shader.getLayers()

    // search for hovers and other special rules for the renderer
    layers = this.processLayersRules(layers)

    styleLayers = g.data(layers)

    styleLayers.each(function (layer) {
      var sym = self._getSymbolizer(layer)
      var features
      if (!updating) {
        features = self._createFeatures(layer, collection, this)
      } else {
        features = d3.select(this).selectAll('.' + sym)
      }
      this.tilePoint = tilePoint
      self._styleFeatures(layer, features, this)
    })
    svgSel.attr('class', svgSel.attr('class') + ' leaflet-tile-loaded')
  },

  _styleFeatures: function (layer, features, group) {
    var self = this
    features.each(function (d) {
      if (!d.properties) d.properties = {}
      d.properties.global = self.globalVariables
      d.shader = layer.getStyle(d.properties, {zoom: group.tilePoint.zoom, time: self.time})
      if (layer.hover) {
        d.shader_hover = layer.hover.getStyle(d.properties, { zoom: group.tilePoint.zoom, time: self.time })
        _.defaults(d.shader_hover, d.shader)
      }
    })

    self.path.pointRadius(function (d) {
      return (d.shader['marker-width'] || 0) / 2.0
    })
    features.style(self.styleForSymbolizer(this._getSymbolizer(layer), 'shader'))
  },

  _createFeatures: function (layer, collection, group) {
    var sym = this._getSymbolizer(layer)
    var geometry = collection.features
    var transform = transformForSymbolizer(sym)
    if (transform) {
      geometry = geometry.map(transform)
    }

    // select based on symbolizer
    var features = d3.select(group)
      .selectAll('.' + sym)
      .data(geometry)

    if (sym === 'text') {
      features.enter().append('svg:text').attr('class', sym)
      features = this._transformText(features)
    } else {
      features.enter().append('path').attr('class', sym)
      features.attr('d', this.path)
    }
    features.exit().remove()
    return features
  },

  _getSymbolizer: function (layer) {
    var symbolizers = layer.getSymbolizers()
    symbolizers = _.filter(symbolizers, function (f) {
      return f !== '*'
    })
    // merge line and polygon symbolizers
    symbolizers = _.uniq(symbolizers.map(function (d) { return d === 'line' ? 'polygon' : d }))
    return symbolizers[0]
  },

  _transformText: function (feature) {
    feature.text(function (d) {
      return 'text' // d.shader['text-name']
    })
    feature.attr('dy', '.35em')
    feature.attr('text-anchor', 'middle')
    feature.attr('x', function (d) {
      var p = this.layer.latLngToLayerPoint(d.geometry.coordinates[1], d.geometry.coordinates[0])
      return p.x
    })
    feature.attr('y', function (d) {
      var p = this.layer.latLngToLayerPoint(d.geometry.coordinates[1], d.geometry.coordinates[0])
      return p.y
    })
  }
}

function transformForSymbolizer (symbolizer) {
  if (symbolizer === 'markers' || symbolizer === 'labels') {
    var pathC = d3.geo.path().projection(function (d) { return d })
    return function (d) {
      return d._centroid || (d._centroid = {
        type: 'Point',
        properties: d.properties,
        coordinates: pathC.centroid(d)
      })
    }
  }
  return null
}

module.exports = Renderer
