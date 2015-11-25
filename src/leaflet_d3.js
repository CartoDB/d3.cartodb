var Renderer = require("./renderer");
var providers = require("./providers");

L.CartoDBd3Layer = L.Class.extend({

  options: {
    minZoom: 0,
    maxZoom: 28,
    tileSize: 256,
    zoomOffset: 0,
    maxNativeZoom: 100
  },

  initialize: function (options) {
    var self = this;
    options = options || {};
    L.Util.setOptions(this, options);
  },

  onAdd: function (map) {
    this._map = map;
    this.options.layer = this;
    if (this.options.urlTemplate || this.options.tilejson){
      this.provider = new providers.XYZProvider(this.options);
    }
    else {
      this.provider = this.options.provider || new providers.SQLProvider(this.options);
    }
    this.renderer = this.options.renderer || new Renderer(this.options);

    var tilePane = this._map._panes.tilePane;
    var layer = L.DomUtil.create('div', 'leaflet-layer');
    var _container = layer.appendChild(L.DomUtil.create('div',"leaflet-tile-container leaflet-zoom-animated"));
    layer.appendChild(_container);
    tilePane.appendChild(layer);
    this._container = _container;

    this._map.on('zoomstart', function(){
      this.provider.invalidateCache();
      this._container.innerHTML = '';
    }, this);

    // Initialize the tileLoader and bind to events
    this.tileLoader = new L.TileLoader({
      tileSize: this.options.tileSize,
      map: map
    });
    this.tileLoader.on('tileAdded', this.loadTile.bind(this));
    this.tileLoader.bind(map);
  },

  onRemove: function (map) {
    this.tileLoader.unbind();
    this._container.parentNode.removeChild(this._container);
  },

  addTo: function (map) {
    map.addLayer(this);
    return this;
  },

  loadTile: function (tilePoint) {
    var self = this;
    var tile = this.tileLoader.getTile(tilePoint);
    if(!tile) {
      tile = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    }
    tile.setAttribute("class", "leaflet-tile");
    this._container.appendChild(tile);

    this.provider.getTile(tilePoint, function(tilePoint, geometry){
      self.renderer.render(tile, geometry, tilePoint);
    });

    var tileSize = this._getTileSize();
    var tilePos = this.tileLoader._getTilePos(tilePoint, tileSize);
    tile.style.width = tile.style.height = tileSize + 'px';
    L.DomUtil.setPosition(tile, tilePos, L.Browser.chrome);
  },

  _getTileSize: function () {
    var map = this._map,
    zoom = map.getZoom() + this.options.zoomOffset,
    zoomN = this.options.maxNativeZoom,
    tileSize = this.options.tileSize;

    if (zoomN && zoom > zoomN) {
      tileSize = Math.round(map.getZoomScale(zoom) / map.getZoomScale(zoomN) * tileSize);
    }

    return tileSize;
  },

  setCartoCSS: function(cartocss){
    this.renderer.setCartoCSS(cartocss);
  }
});