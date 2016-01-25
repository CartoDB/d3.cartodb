var Renderer = require('./renderer')
var providers = require('./providers')
var TileLoader = require('./tileloader')
var L = window.L

L.CartoDBd3Layer = L.TileLayer.extend({
  options: {
    minZoom: 0,
    maxZoom: 28,
    tileSize: 256,
    zoomOffset: 0,
    tileBuffer: 50
  },

  initialize: function (options) {
    options = options || {}
    this.renderers = []
    this.svgTiles = {}
    this._animated = true
    L.Util.setOptions(this, options)
  },

  on: function (index, eventName, callback) {
    if (this.renderers.length > 0 && eventName in this.renderers[index].events) {
      this.renderers[index].on(eventName, callback)
    } else {
      L.TileLayer.prototype.on.call(this, arguments[0], arguments[1])
    }
  },

  onAdd: function (map) {
    this._map = map
    this.options.map = map
    this.options.layer = this
    var styles = this.options.styles
    if (!styles) {
      styles = [this.options.cartocss]
      this.options.styles = styles
    }

    if (this.options.table && this.options.user) {
      this.provider = new providers.WindshaftProvider(this.options)
    } else {
      this.provider = new providers.XYZProvider(this.options)
    }
    this._initContainer()

    this.tileLoader = new TileLoader({
      tileSize: this.options.tileSize,
      maxZoom: this.options.maxZoom,
      minZoom: this.options.minZoom,
      provider: this.provider,
      map: map
    })
    this.tileLoader.loadTiles()
    this.provider.on('ready', function () {
      if (styles.length > 0) {
        for (var i = 0; i < styles.length; i++) {
          this.renderers.push(new Renderer({
            cartocss: styles[i],
            layer: this,
            index: i
          }))
        }
      } else {
        this.renderers.push(new Renderer({
          cartocss: '',
          layer: this,
          index: 0
        }))
      }
      this._tileContainer.setAttribute('class', 'leaflet-zoom-animated leaflet-tile-container')
      this._bgBuffer.setAttribute('class', 'leaflet-zoom-animated leaflet-tile-container')
      this.tileLoader.on('tileAdded', this._renderTile, this)
      this.tileLoader.on('tileRemoved', this._clearTile, this)
      this._map.on({
        'zoomanim': this._animateZoom,
        'zoomend': this._endZoomAnim
      }, this)
    })
  },

  onRemove: function (map) {
    this.tileLoader.unbindAndClearTiles()
  },

  addTo: function (map) {
    map.addLayer(this)
    return this
  },

  _renderTile: function (data) {
    var tilePoint = data.tilePoint
    var geometry = data.geometry
    var self = this
    var tileKey = tilePoint.x + ':' + tilePoint.y + ':' + tilePoint.zoom
    var tile = this.svgTiles[tileKey]
    if (!tile) {
      tile = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      // tile.style.padding = this.options.tileBuffer + 'px'
      // tile.style.margin = '-' + this.options.tileBuffer + 'px'
      tile.setAttribute('class', 'leaflet-tile')
      this.svgTiles[tileKey] = tile
      this._tileContainer.appendChild(tile)
    }

    this._initTileEvents(tile)

    for (var i = 0; i < self.renderers.length; i++) {
      var collection = self.renderers.length > 1 ? geometry.features[i] : geometry
      self.renderers[i].render(tile, collection, tilePoint)
    }

    var tilePos = this._getTilePos(tilePoint)
    tile.style.width = tile.style.height = this._getTileSize() + 'px'
    L.DomUtil.setPosition(tile, tilePos, L.Browser.chrome)
  },

  _initTileEvents: function (tile) {
    var self = this
    tile.onmouseenter = function () {
      for (var i = 0; i < this.children.length; i++) {
        var group = this.children[i]
        for (var p = 0; p < group.children.length; p++) {
          group.children[p].onmouseenter = self.renderers[i].events.featureOver
          group.children[p].onmouseleave = self.renderers[i].events.featureOut
          group.children[p].onmouseclick = self.renderers[i].events.featureClick
        }
      }
    }
    tile.onmouseleave = function () {
      for (var i = 0; i < this.children.length; i++) {
        var group = this.children[i]
        for (var p = 0; p < group.length; p++) {
          group.children[p].onmouseenter = null
          group.children[p].onmouseleave = null
          group.children[p].onmouseclick = null
        }
      }
    }
  },

  _clearTile: function (data) {
    var split = data.tileKey.split(':')
    var tilePoint = {x: split[0], y: split[1], zoom: split[2]}
    this.renderers.forEach(function (r) {
      r.filter.removeTile(tilePoint)
    })
    if (this._map.getZoom() === tilePoint.zoom) {
      this.svgTiles[data.tileKey].parentNode.removeChild(this.svgTiles[data.tileKey])
    }
    delete this.svgTiles[data.tileKey]
  },

  _getTilePos: function (tilePoint) {
    tilePoint = new L.Point(tilePoint.x, tilePoint.y)
    var origin = this._map.getPixelOrigin()
    var tileSize = this._getTileSize()

    return tilePoint.multiplyBy(tileSize).subtract(origin)
  },

  latLngToLayerPoint: function (lat, lng) {
    return this._map.latLngToLayerPoint(new L.LatLng(lat, lng))
  },

  _getTileSize: function () {
    var map = this._map
    var zoom = map.getZoom() + this.options.zoomOffset
    var zoomN = this.options.maxNativeZoom
    var tileSize = this.options.tileSize

    if (zoomN && zoom > zoomN) {
      tileSize = Math.round(map.getZoomScale(zoom) / map.getZoomScale(zoomN) * tileSize)
    }

    return tileSize
  },

  setCartoCSS: function (index, cartocss) {
    this.renderers[index].setCartoCSS(cartocss)
  },

  _getLoadedTilesPercentage: function (container) {
    var tiles = container.getElementsByTagName('svg')
    var i, len
    var count = 0

    for (i = 0, len = tiles.length; i < len; i++) {
      if (tiles[i].complete) {
        count++
      }
    }
    return count / len
  },

  _endZoomAnim: function () {
    var front = this._tileContainer
    var bg = this._bgBuffer
    front.style.visibility = ''
    front.parentNode.appendChild(front) // Bring to fore
    bg.style.transform = ''
    bg.innerHTML = ''
    // force reflow
    L.Util.falseFn(bg.offsetWidth)

    this._animating = false
  },

  _stopLoadingImages: function (container) {
    var tiles = Array.prototype.slice.call(container.getElementsByTagName('svg'))
    var i, len, tile

    for (i = 0, len = tiles.length; i < len; i++) {
      tile = tiles[i]

      if (!tile.complete) {
        tile.onload = L.Util.falseFn
        tile.onerror = L.Util.falseFn
        tile.src = L.Util.emptyImageUrl

        tile.parentNode.removeChild(tile)
      }
    }
  }
})
