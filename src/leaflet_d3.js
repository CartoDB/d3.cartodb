var Renderer = require('./renderer')
var providers = require('./providers')
var TileLoader = require('./tileloader')
var geo = require('./geo')
var L = window.L

L.CartoDBd3Layer = L.TileLayer.extend({
  options: {
    minZoom: 0,
    maxZoom: 28,
    tileSize: 256,
    zoomOffset: 0,
    tileBuffer: 50
  },

  events: {
    featureOver: null,
    featureOut: null,
    featureClick: null
  },

  initialize: function (options) {
    options = options || {}
    this.renderers = []
    this.svgTiles = {}
    this.eventCallbacks = {}
    this._animated = true
    L.Util.setOptions(this, options)
    var styles = this.options.styles
    if (!styles) {
      styles = [this.options.cartocss]
      this.options.styles = styles
    }
    if (this.options.layers && this.options.user) {
      this.provider = new providers.WindshaftProvider(this.options)
    } else {
      this.provider = new providers.XYZProvider(this.options)
    }
    this.provider.on('ready', this._resetRenderers.bind(this))
  },

  on: function (eventName, callback) {
    if (eventName in this.events) {
      if (this.renderers.length > 0) {
        this.renderers.forEach(function (renderer) {
          renderer.on(eventName, callback)
        })
      } else {
        this.eventCallbacks[eventName] = callback
      }
    } else {
      L.TileLayer.prototype.on.call(this, arguments[0], arguments[1])
    }
  },

  _getVisibleTiles: function () {
    var bounds = this._map.getBounds()
    var zoom = this._map.getZoom()
    var northWest = bounds.getNorthWest()
    var southEast = bounds.getSouthEast()
    var nwTile = geo.latLng2Tile(northWest.lat, northWest.lng, zoom)
    var seTile = geo.latLng2Tile(southEast.lat, southEast.lng, zoom)
    var tiles = []
    var ring = []
    for(var y = nwTile.y; y<=seTile.y; y++) {
      for(var x = nwTile.x; x<=seTile.x; x++) {
        if (y === nwTile.y || y === seTile.y || x === nwTile.x || x === seTile.x){
          ring.push([x,y,zoom].join(':'))
        }
        else{
          tiles.push([x,y,zoom].join(':'))
        }
      }
    }
    var se = geo.geo2Webmercator(southEast.lng, southEast.lat)
    var nw = geo.geo2Webmercator(northWest.lng, northWest.lat)
    return { tiles: tiles, ring: ring, se: se, nw: nw }
  },

  applyFilter: function (sublayerIndex, filterType, filterOptions) {
    var sublayer = this.renderers[sublayerIndex]
    switch (filterType) {
      case 'accept':
        sublayer.filter.filterAccept(filterOptions.column, filterOptions.values)
        break
      case 'reject':
        sublayer.filter.filterReject(filterOptions.column, filterOptions.values)
        break
      case 'range':
        sublayer.filter.filterRange(filterOptions.column, [filterOptions.min, filterOptions.max])
        break
    }
    sublayer.redraw()
  },

  setProvider: function (options) {
    this.styles = options.styles
    this.provider.setURL(options.urlTemplate)
  },
  setUrl: function (url) {
    this.setProvider({
      styles: this.options.styles,
      urlTemplate: url
    })
  },

  featuresLoaded: function () {
    if (!this.provider) return false
    return this.provider.allTilesLoaded()
  },

  getFilter: function (layerIndex) {
    return this.renderers[layerIndex].filter
  },

  getFeatures: function () {
    var features = []
    if (this.renderers.length > 0) {
      this.renderers.forEach(function (r) {
        features.push(r.filter.getValues())
      })
    }
    return features
  },

  onAdd: function (map) {
    this._map = map
    this.options.map = map
    this.options.layer = this
    this._initContainer()

    this.tileLoader = new TileLoader({
      tileSize: this.options.tileSize,
      maxZoom: this.options.maxZoom,
      minZoom: this.options.minZoom,
      provider: this.provider,
      map: map
    })
    this.tileLoader.loadTiles()
    this._tileContainer.setAttribute('class', 'leaflet-zoom-animated leaflet-tile-container')
    this._bgBuffer.setAttribute('class', 'leaflet-zoom-animated leaflet-tile-container')
    this.tileLoader.on('tileAdded', this._renderTile, this)
    this.tileLoader.on('tileRemoved', this._clearTile, this)
    this.tileLoader.on('tilesLoaded', function () {
      this._setBoundingBox()
      this.fire('featuresChanged', this.getFeatures())
    }, this)
    this._map.on({
      'zoomanim': this._animateZoom,
      'zoomend': this._endZoomAnim,
      'moveend': this._setBoundingBox
    }, this)
  },

  onRemove: function (map) {
    this.tileLoader.unbindAndClearTiles()
  },

  addTo: function (map) {
    map.addLayer(this)
    return this
  },

  _setBoundingBox: function () {
    var visible = this._getVisibleTiles()
    this.renderers.forEach(function (renderer) {
      renderer.filter.setBoundingBox(visible)
    })
  },

  _resetRenderers: function () {
    var self = this
    if (this.renderers.length > 0) {
      this.renderers = []
    }
    var styles = this.options.styles
    if (styles.length > 0) {
      for (var i = 0; i < styles.length; i++) {
        this.renderers.push(new Renderer({
          cartocss: styles[i],
          index: i,
          layer: this
        }))
      }
    } else {
      this.renderers.push(new Renderer({
        cartocss: '',
        index: 0,
        layer: this
      }))
    }
    for (var tileKey in this.svgTiles) {
      var split = tileKey.split(':')
      var tilePoint = {
        x: parseInt(split[0], 10),
        y: parseInt(split[1], 10),
        zoom: parseInt(split[2], 10)
      }
      this.tileLoader._loadTile(tilePoint)
    }
    this.renderers.forEach(function (r) {
      r.filter.on('filterApplied', function () {
        self.fire('featuresChanged', self.getFeatures())
      })
      for (var key in self.eventCallbacks){
        r.on(key, function() {
          var latLng = self._map.layerPointToLatLng([arguments[2].x, arguments[2].y])
          arguments[1] = Object.keys(latLng).map(function(e){return latLng[e]})
          self.eventCallbacks[key].apply(self, arguments)
        })
      }
    })
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

    for (var i = 0; i < self.renderers.length; i++) {
      if (geometry.features.length > 1 && geometry.features[0].type === 'FeatureCollection') { // This means there's more than one layer
        if (geometry.features.length !== this.renderers.length) return
      } else {
        if (this.renderers.length > 1) return
      }
      var collection = self.renderers.length > 1 ? geometry.features[i] : geometry
      self.renderers[i].render(tile, collection, tilePoint)
    }

    var tilePos = this._getTilePos(tilePoint)
    tile.style.width = tile.style.height = this._getTileSize() + 'px'
    L.DomUtil.setPosition(tile, tilePos, L.Browser.chrome)
  },

  _clearTile: function (data) {
    var split = data.tileKey.split(':')
    var tilePoint = {x: split[0], y: split[1], zoom: split[2]}
    this.renderers.forEach(function (r) {
      r.filter.removeTile(tilePoint)
    })
    if (this._tileContainer.hasChildNodes(this.svgTiles[data.tileKey])){
      this._tileContainer.removeChild(this.svgTiles[data.tileKey])
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
    this.options.styles[index] = cartocss
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
    this.tileLoader._tilesLoading = {}
    for (i = 0, len = tiles.length; i < len; i++) {
      tile = tiles[i]
      tile.parentNode.removeChild(tile)
    }
    this.provider.abortPending()
  }
})
