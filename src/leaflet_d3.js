var Renderer = require("./renderer");

L.CartoDBd3Layer = L.Class.extend({

	includes: [L.Mixin.Events, L.Mixin.TileLoader],

	options: {
		minZoom: 0,
		maxZoom: 28,
		tileSize: 256,
		subdomains: 'abc',
		errorTileUrl: '',
		attribution: '',
		zoomOffset: 0,
		opacity: 1,
		unloadInvisibleTiles: L.Browser.mobile,
		updateWhenIdle: L.Browser.mobile,
		tileLoader: false, // installs tile loading events
		zoomAnimation: true
	},

	initialize: function (options) {
		var self = this;
		options = options || {};
		L.Util.setOptions(this, options);
	},

	onAdd: function (map) {
		this._map = map;
		this.options.map = map;
		this.options.layer = this;
		this.renderer = new Renderer(this.options);
		var tilePane = this._map._panes.tilePane;
		var layer = L.DomUtil.create('div', 'leaflet-layer');
		var _container = layer.appendChild(L.DomUtil.create('div',"leaflet-tile-container leaflet-zoom-animated"));
		layer.appendChild(_container);
		tilePane.appendChild(layer);
		this._container = _container;
	  this._initTileLoader();
	},

	addTo: function (map) {
		map.addLayer(this);
		return this;
	},

	loadTile: function (tilePoint) {
		var tile = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		tile.setAttribute("class", "leaflet-tile");
		this._container.appendChild(tile);

		this.renderer.drawTile(tile, tilePoint, this._tileLoaded.bind(this));

		var tilePos = this._getTilePos(tilePoint);
		tile.style.width = tile.style.height = this._getTileSize() + 'px';
		L.DomUtil.setPosition(tile, tilePos, L.Browser.chrome);
	},

	_initTileLoader: function() {
		this._tiles = {}
		this._tilesLoading = {};
		this._tilesToLoad = 0;
		this._map.on({
			'moveend': this._updateTiles
		}, this);
		this.on('tileAdded', this.loadTile);
		this._updateTiles();
	},

	latLngToLayerPoint: function(lat, lng){
    return map.latLngToLayerPoint(new L.LatLng(lat,lng));
	},

  _removeTile: function (key) {
  	this._container.removeChild(this._tiles[key]);
  	this.fire('tileRemoved', this._tiles[key]);
  	delete this._tiles[key];
  	delete this._tilesLoading[key];
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
		this._reloadTiles();
	}
})