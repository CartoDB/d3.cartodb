/** global L **/
var d3 = global.d3 || require('d3')
var cartodb = global.cartodb || {}
var carto = global.carto || require('carto')
var _ = global._ || require('underscore')
var geo = require('./geo')
var Filter = require('./filter')
var turboCarto = require('turbo-carto')
var Datasource = require('./datasource')

cartodb.d3 = d3 || {}

d3.selection.prototype.moveToFront = function () {
  return this.each(function () {
    this.parentNode.appendChild(this)
  })
}

var Renderer = function (options) {
  this.options = options
  this.idField = options.idField || 'cartodb_id'
  this.index = options.index
  this.filter = new Filter({ idField: this.idField })
  this.styleHistory = []
  if (options.cartocss) {
    this.setCartoCSS(options.cartocss)
  }
  this.globalVariables = {}
  this.layer = options.layer
  this.geometries = {}
}

Renderer.prototype = {
  events: {
    featureOver: null,
    featureOut: null,
    featureClick: null
  },

  /**
   * changes a global variable in cartocss
   * it can be used in cartocss in this way:
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

  setCartoCSS: function (cartocss, transition) {
    var self = this
    if (Renderer.isTurboCarto(cartocss)) {
      this._applyStyle(cartocss, transition)
    } else {
      if (this.layer && (!this.layer.tileLoader || !_.isEmpty(this.layer.tileLoader._tilesLoading))) {
        this.filter.on('featuresChanged', function () {
          self._setTurboCarto(cartocss, transition)
        })
      } else {
        self._setTurboCarto(cartocss, transition)
      }
    }
  },

  _setTurboCarto: function (cartocss, transition) {
    this._preprocessCartoCSS(cartocss, function (err, parsedCartoCSS) {
      if (err) {
        console.error(err.message)
        throw err
      }
      this._applyStyle(parsedCartoCSS, transition)
    }.bind(this))
  },

  _applyStyle: function (cartocss, transition) {
    this._addStyleToHistory(cartocss)
    this.renderer = new carto.RendererJS()
    cartocss = Renderer.cleanCSS(cartocss)
    this.shader = this.renderer.render(cartocss)
    if (this.layer) {
      for (var tileKey in this.layer.svgTiles) {
        var tilePoint = tileKey.split(':')
        tilePoint = {x: tilePoint[0], y: tilePoint[1], zoom: tilePoint[2]}
        this.render(this.layer.svgTiles[tileKey], null, tilePoint, false, transition)
      }
    }
  },

  _addStyleToHistory: function (cartocss) {
    if (this.styleHistory[this.styleHistory.length - 1] !== cartocss) {
      this.styleHistory.push(cartocss)
    }
  },

  restoreCartoCSS: function (transition) {
    this.setCartoCSS(this.styleHistory[0], transition)
  },

  _preprocessCartoCSS: function (cartocss, callback) {
    var datasource = new Datasource(this.filter)
    turboCarto(cartocss, datasource, callback)
  },

  on: function (eventName, callback) {
    var self = this
    if (eventName === 'featureOver') {
      this.events.featureOver = function (f) {
        this.style.cursor = 'pointer'
        var selection = d3.select(this)
        var properties = selection.data()[0].properties
        var index = Renderer.getIndexFromFeature(this)
        var layerPoint = self._getLayerPointFromEvent(self.layer._map, f)
        var latLng = self.layer._map.layerPointToLatLng(layerPoint)
        var pos = self.layer._map.layerPointToContainerPoint(layerPoint)
        self.layer.eventCallbacks.featureOver(f, [ latLng.lat, latLng.lng ], pos, properties, index)
      }
    } else if (eventName === 'featureOut') {
      this.events.featureOut = function (f) {
        var selection = d3.select(this)
        var properties = selection.data()[0].properties
        var sym = this.attributes['class'].value
        selection.reset = function () {
          selection.style(self.styleForSymbolizer(sym, 'shader'))
        }
        var index = Renderer.getIndexFromFeature(this)
        var layerPoint = self._getLayerPointFromEvent(self.layer._map, f)
        var latLng = self.layer._map.layerPointToLatLng(layerPoint)
        var pos = self.layer._map.layerPointToContainerPoint(layerPoint)
        self.layer.eventCallbacks.featureOut(f, [ latLng.lat, latLng.lng ], pos, properties, index)
      }
    } else if (eventName === 'featureClick') {
      this.events.featureClick = function (f) {
        var selection = d3.select(this)
        var properties = selection.data()[0].properties
        var index = Renderer.getIndexFromFeature(this)
        var layerPoint = self._getLayerPointFromEvent(self.layer._map, f)
        var latLng = self.layer._map.layerPointToLatLng(layerPoint)
        var pos = self.layer._map.layerPointToContainerPoint(layerPoint)
        self.layer.eventCallbacks.featureClick(f, [ latLng.lat, latLng.lng ], pos, properties, index)
      }
    } else if (eventName === 'featuresChanged') {
      this.filter.on('featuresChanged', callback)
    }
  },

  inferGeometryType: function () {
    return this.filter.surveyRandom(5, function (f) {
      if (f.type === 'Point' || f.geometry.type === 'Point') return 'marker'
      else if (f.geometry.type.toLowerCase().indexOf('polygon') > -1) return 'polygon'
      else if (f.geometry.type.toLowerCase().indexOf('line') > -1) return 'line'
    })[0]
  },

  _getLayerPointFromEvent: function (map, event) {
    var curleft = 0
    var curtop = 0
    var obj = map.getContainer()

    var x, y
    if (event.changedTouches && event.changedTouches.length > 0) {
      x = event.changedTouches[0].clientX + window.scrollX
      y = event.changedTouches[0].clientY + window.scrollY
    } else {
      x = event.clientX
      y = event.clientY
    }

    var pointX
    var pointY
    // If the map is fixed at the top of the window, we can't use offsetParent
    // cause there might be some scrolling that we need to take into account.
    if (obj.offsetParent && obj.offsetTop > 0) {
      do {
        curleft += obj.offsetLeft
        curtop += obj.offsetTop
      } while (obj = obj.offsetParent)  // eslint-disable-line
      pointX = x - curleft
      pointY = y - curtop
    } else {
      var rect = obj.getBoundingClientRect()
      var scrollX = (window.scrollX || window.pageXOffset)
      var scrollY = (window.scrollY || window.pageYOffset)
      pointX = (event.clientX ? event.clientX : x) - rect.left - obj.clientLeft - scrollX
      pointY = (event.clientY ? event.clientY : y) - rect.top - obj.clientTop - scrollY
    }
    var point = new window.L.Point(pointX, pointY)
    return map.containerPointToLayerPoint(point)
  },

  redraw: function (updating) {
    if (this.layer) {
      for (var tileKey in this.layer.svgTiles) {
        var tilePoint = tileKey.split(':')
        this.layer.svgTiles[tileKey].children[this.index].innerHTML = ''
        tilePoint = {x: tilePoint[0], y: tilePoint[1], zoom: tilePoint[2]}
        this.render(this.layer.svgTiles[tileKey], null, tilePoint, false)
      }
    }
  },

  // there are special rules for layers, for example "::hover", this function
  // search for them and attach to the original layer, so if you have
  // #test {}
  // #test::hover {}
  // this function will return an array with a single layer. That layer will contain a
  // hover as an attribute
  processLayersRules: function (layers) {
    var specialAttachments = ['hover']
    var realLayers = []
    var attachments = []
    // map layer names
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

  styleForSymbolizer: function (symbolyzer, shaderName) {
    if (symbolyzer === 'polygon' || symbolyzer === 'line') {
      return {
        'fill': function (d) { return d[shaderName]['polygon-fill'] || 'none' },
        'fill-opacity': function (d) { return d[shaderName]['polygon-opacity'] },
        'stroke': function (d) { return d[shaderName]['line-color'] },
        'stroke-width': function (d) { return d[shaderName]['line-width'] },
        'stroke-opacity': function (d) { return d[shaderName]['line-opacity'] },
        'mix-blend-mode': function (d) { return d[shaderName]['comp-op'] || d[shaderName][symbolyzer + '-comp-op'] },
        'stroke-dasharray': function (d) { return d[shaderName]['line-dasharray'] }
      }
    } else if (symbolyzer === 'markers') {
      return {
        'fill': function (d) { return d[shaderName]['marker-fill'] || 'none' },
        'fill-opacity': function (d) { return d[shaderName]['marker-fill-opacity'] },
        'stroke': function (d) { return d[shaderName]['marker-line-color'] },
        'stroke-opacity': function (d) { return d[shaderName]['marker-line-opacity'] },
        'stroke-width': function (d) { return d[shaderName]['marker-line-width'] },
        'radius': function (d) {
          return d[shaderName]['marker-width'] / 2
        },
        'mix-blend-mode': function (d) { return d[shaderName]['comp-op'] || d[shaderName]['marker-comp-op']},
        'stroke-dasharray': function (d) { return d[shaderName]['line-dasharray'] }
      }
    } else if (symbolyzer === 'text') {
      return {
        'fill': function (d) { return d[shaderName]['text-fill'] || 'none' },
        'mix-blend-mode': function (d) { return d[shaderName]['comp-op'] || d[shaderName]['text-comp-op'] }
      }
    }
  },

  generateProjection: function (tilePoint) {
    var corrected_x = geo.wrapX(tilePoint.x, tilePoint.zoom)
    return function (x, y) {
      var earthRadius = 6378137 * 2 * Math.PI
      var earthRadius2 = earthRadius / 2
      var invEarth = 1.0 / earthRadius
      var pixelScale = 256 * (1 << tilePoint.zoom)
      x = pixelScale * (x + earthRadius2) * invEarth
      y = pixelScale * (-y + earthRadius2) * invEarth
      if (this.stream) {
        this.stream.point(x - corrected_x * 256, y - tilePoint.y * 256)
      } else {
        return { x: x - corrected_x * 256, y: y - tilePoint.y * 256 }
      }
    }
  },

  render: function (svg, collection, tilePoint, updating, transition) {
    var self = this
    collection = this.filter.addTile(tilePoint, collection) // It won't add duplicates
    var g
    var svgSel = d3.select(svg)
    if (svg.children[this.index]) {
      g = d3.select(svg.children[this.index])
    } else {
      g = svgSel.append('g')
    }
    this.projection = this.generateProjection(tilePoint)
    this.path = d3.geo.path().projection(d3.geo.transform({ point: this.projection }))

    if (!this.shader || !collection || collection.features.length === 0) return
    var layers = this.shader.getLayers()

    // search for hovers and other special rules for the renderer
    layers = this.processLayersRules(layers)

    layers.forEach(function (layer, i) {
      var thisGroup
      var children = g[0][0].children
      if (!children[i]) thisGroup = g.append('g')
      else thisGroup = d3.select(children[i])
      var sym = self._getSymbolizers(layer)[0]
      var features
      if (!updating) {
        features = self._createFeatures(layer, collection, thisGroup[0][0])
      } else {
        features = thisGroup.selectAll('.' + sym)
      }
      this.tilePoint = tilePoint
      self._styleFeatures(layer, features, this, transition)
    })
    svgSel.attr('class', svgSel.attr('class') + ' leaflet-tile-loaded')
  },

  _styleFeatures: function (layer, features, group, transition) {
    var sym = this._getSymbolizers(layer)[0]
    var self = this
    features.each(function (d) {
      if (!d.properties) d.properties = {}
      var featureHash = geo.hashFeature(d.properties[self.idField], group.tilePoint)
      if (!self.geometries[featureHash]) self.geometries[featureHash] = []
      self.geometries[featureHash].push(this)
      d.properties.global = self.globalVariables
      d.shader = layer.getStyle(d.properties, {zoom: group.tilePoint.zoom, time: self.time})
      this.onmousemove = self.events.featureOver
      this.onmouseleave = self.events.featureOut
      this.onclick = self.events.featureClick
      if (layer.hover) {
        d.shader_hover = layer.hover.getStyle(d.properties, { zoom: group.tilePoint.zoom, time: self.time })
        _.defaults(d.shader_hover, d.shader)
        self.events.featureOver = function (f) {
          this.style.cursor = 'default'
          var element = d3.select(this).data()[0]
          var hash = geo.hashFeature(element.properties[self.idField], element.properties.tilePoint)
          self.geometries[hash].forEach(function (feature) {
            d3.select(feature).style(self.styleForSymbolizer(sym, 'shader_hover'))
          })
        }
        self.events.featureOut = function () {
          var element = d3.select(this).data()[0]
          var hash = geo.hashFeature(element.properties[self.idField], element.properties.tilePoint)
          self.geometries[hash].forEach(function (feature) {
            d3.select(feature).style(self.styleForSymbolizer(sym, 'shader'))
          })
        }
      }
    })
    if (sym === 'text') {
      features = this._transformText(features)
    }
    this._getSymbolizers(layer).forEach(function (sym) {
      var style = self.styleForSymbolizer(sym, 'shader')
      var delays = {}
      if (transition) {
        features.filter(sym === 'markers' ? 'circle' : 'path').transition().duration(500).delay(function (f) {
            return Math.floor(Math.random() * 500)
        }).style(style).attr('r', style.radius)
      } else { 
        features.filter(sym === 'markers' ? 'circle' : 'path').style(style).attr('r', style.radius)
      }
    })
  },

  _createFeatures: function (layer, collection, group) {
    var self = this
    var sym = this._getSymbolizers(layer)[0]
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
    } else {
      features.enter().append(function (f) {
        return document.createElementNS('http://www.w3.org/2000/svg', {
          'Feature': 'path',
          'Point': 'circle'
        }[f.type])
      }).each(function (f) {
        var selection = d3.select(this)
        if (f.type === 'Feature') {
          selection.attr('class', sym).attr('d', self.path)
        } else {
          if (f.coordinates[0]) {
            var coords = self.projection.apply(this, f.coordinates)
            selection.attr('class', 'markers').attr('cx', coords.x).attr('cy', coords.y)
          }
        }
      })
    }
    features.exit().remove()
    return features
  },

  _getSymbolizers: function (layer) {
    var symbolizers = layer.getSymbolizers()
    symbolizers = _.filter(symbolizers, function (f) {
      return f !== '*'
    })
    // merge line and polygon symbolizers
    symbolizers = _.uniq(symbolizers.map(function (d) { return d === 'line' ? 'polygon' : d }))
    return symbolizers
  },

  _transformText: function (feature) {
    var self = this
    feature.text(function (d) {
      return d.shader['text-name']
    })
    feature.attr('dy', function (d) {
      return d.shader['text-dy']
    })
    feature.attr('text-anchor', 'middle')
    feature.attr('x', function (d) {
      if (d.geometry.coordinates[0]) {
        var p = self.projection(d.geometry.coordinates[0], d.geometry.coordinates[1])
        return p.x
      } else {
        this.remove()
      }
    })
    feature.attr('y', function (d) {
      if (d.geometry.coordinates[0]) {
        var p = self.projection(d.geometry.coordinates[0], d.geometry.coordinates[1])
        return p.y
      } else {
        this.remove()
      }
    })
    return feature
  }
}

Renderer.getIndexFromFeature = function (element) {
  var i = 0
  var node = element.parentElement.parentElement
  while (node = node.previousSibling) i++ // eslint-disable-line
  return i
}

Renderer.isTurboCarto = function (cartocss) {
  var reservedWords = ['ramp', 'colorbrewer', 'buckets']
  var isTurbo = reservedWords
    .map(function (w) {
      return w + '('
    })
    .map(String.prototype.indexOf.bind(cartocss))
    .every(function (f) { return f === -1 })
  return isTurbo
}

Renderer.cleanCSS = function (cartocss) {
  return cartocss.replace(/\#[^\n;:}]*?[\{[]/g, function (f) { 
    return f.replace(f.replace("#","").replace("{","").replace("[","").trim(), "layer")
  })
}

function transformForSymbolizer (symbolizer) {
  if (symbolizer === 'markers' || symbolizer === 'labels') {
    var pathC = d3.geo.path().projection(function (d) { return d })
    return function (d) {
      if (d.geometry.type === 'Point') {
        return d._centroid || (d._centroid = {
          type: 'Point',
          properties: d.properties,
          coordinates: pathC.centroid(d)
        })
      } else {
        return d
      }
    }
  }
  return null
}

module.exports = Renderer
