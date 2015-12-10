var Renderer = require("./renderer");
var providers = require("./providers");
var TileLoader = require('./tileloader');

L.CartoDBd3Layer = L.Class.extend({

  options: {
    minZoom: 0,
    maxZoom: 28,
    tileSize: 256,
    zoomOffset: 0
  },

  initialize: function (options) {
    var self = this;
    options = options || {};
    this.renderers = [];
    this.svgTiles = {};
    L.Util.setOptions(this, options);
  },

  on: function(index, eventName, callback) {
    if (eventName in this.renderers[index].events){
      this.renderers[index].on(eventName, callback);
    }
    else{
      L.Class.prototype.on.call(arguments.slice(1));
    }
  },

  onAdd: function (map) {
    this._map = map;
    this.options.map = map;
    this.options.layer = this;
    var styles = this.options.styles;
    if(!styles){
      styles = [this.options.cartocss];
      this.options.styles = styles;
    }
    if (this.options.urlTemplate || this.options.tilejson){
      this.provider = new providers.XYZProvider(this.options);
    }
    else {
      this.provider = this.options.provider || new providers.WindshaftProvider(this.options);
    }
    for (var i = 0; i < styles.length; i++){
      this.renderers.push(new Renderer({
        cartocss: styles[i],
        layer: this
      }));
    }
    var tilePane = this._map._panes.tilePane;
    var layer = L.DomUtil.create('div', 'leaflet-layer');
    var _container = layer.appendChild(L.DomUtil.create('div', "leaflet-tile-container leaflet-zoom-animated"));
    layer.appendChild(_container);
    tilePane.appendChild(layer);
    this._container = _container;

    this.tileLoader = new TileLoader({
      provider: this.provider,
      tileSize: this.options.tileSize,
      map: map
    });
    this.tileLoader.on('tileAdded', this._renderTile, this);
    this.tileLoader.on('tileRemoved', this._clearTile, this);
    this.tileLoader.loadTiles();
  },

  onRemove: function (map) {
    this._container.parentNode.removeChild(this._container);
    this.tileLoader.unbindAndClearTiles();
  },

  addTo: function (map) {
    map.addLayer(this);
    return this;
  },

  _renderTile: function (data) {
    var tilePoint = data.tilePoint;
    var geometry = data.geometry;
    var self = this;
    var tileKey = tilePoint.x + ':' + tilePoint.y + ':' + tilePoint.zoom;
    var tile = this.svgTiles[tileKey];
    if (!tile) {
      tile = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      tile.setAttribute("class", "leaflet-tile");
      this.svgTiles[tileKey] = tile;
      this._container.appendChild(tile);
    }

    for(var i = 0; i < self.renderers.length; i++) {
      var collection = self.renderers.length > 1 ? geometry.features[i] : geometry;
      self.renderers[i].render(tile, collection, tilePoint);
    }

    var tilePos = this._getTilePos(tilePoint);
    tile.style.width = tile.style.height = this._getTileSize() + 'px';
    L.DomUtil.setPosition(tile, tilePos, L.Browser.chrome);
  },

  _clearTile: function(data) {
    var svg = this.svgTiles[data.tileKey];
    this._container.removeChild(svg);
    var split = data.tileKey.split(":");
    var tilePoint = {x: split[0], y: split[1], zoom: split[2]};
    this.renderers.forEach(function(r){
      r.filter.removeTile(tilePoint);
    });
    delete this.svgTiles[data.tileKey];
  },

  _getTilePos: function (tilePoint) {
    tilePoint = new L.Point(tilePoint.x, tilePoint.y);
    var origin = this._map.getPixelOrigin();
    var tileSize = this._getTileSize();

    return tilePoint.multiplyBy(tileSize).subtract(origin);
  },

  latLngToLayerPoint: function(lat, lng){
    return map.latLngToLayerPoint(new L.LatLng(lat,lng));
  },

  _getTileSize: function() {
    var map = this._map,
    zoom = map.getZoom() + this.options.zoomOffset,
    zoomN = this.options.maxNativeZoom,
    tileSize = this.options.tileSize;

    if (zoomN && zoom > zoomN) {
      tileSize = Math.round(map.getZoomScale(zoom) / map.getZoomScale(zoomN) * tileSize);
    }

    return tileSize;
  },

  setCartoCSS: function(index, cartocss){
    this.renderers[index].setCartoCSS(cartocss);
  }
});