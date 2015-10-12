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
		this.renderer = new Renderer(this.options);
		this.renderer.onAdd(map);
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

		this.renderer.drawTile(tile, tilePoint);

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

	_removeTileLoader: function() {
		this._map.off({
			'moveend': this._updateTilesd
		}, this);
		this._removeTiles();
	},

	_updateTiles: function () {

		if (!this._map) { return; }

		var bounds = this._map.getPixelBounds(),
		zoom = this._map.getZoom(),
		tileSize = this.options.tileSize;

		if (zoom > this.options.maxZoom || zoom < this.options.minZoom) {
			return;
		}

		var nwTilePoint = new L.Point(
			Math.floor(bounds.min.x / tileSize),
			Math.floor(bounds.min.y / tileSize)),

		seTilePoint = new L.Point(
			Math.floor(bounds.max.x / tileSize),
			Math.floor(bounds.max.y / tileSize)),

		tileBounds = new L.Bounds(nwTilePoint, seTilePoint);

		this._addTilesFromCenterOut(tileBounds);
		this._removeOtherTiles(tileBounds);
	},

	_removeTiles: function (bounds) {
		for (var key in this._tiles) {
			this._removeTile(key);
		}
	},

	_reloadTiles: function() {
		this._removeTiles();
		this._updateTiles();
	},

	_removeOtherTiles: function (bounds) {
		var kArr, x, y, z, key;
		var zoom = this._map.getZoom();

		for (key in this._tiles) {
			if (this._tiles.hasOwnProperty(key)) {
				kArr = key.split(':');
				x = parseInt(kArr[0], 10);
				y = parseInt(kArr[1], 10);
				z = parseInt(kArr[2], 10);

              // remove tile if it's out of bounds
              if (zoom !== z || x < bounds.min.x || x > bounds.max.x || y < bounds.min.y || y > bounds.max.y) {
              	this._removeTile(key);
              }
          }
      }
  },

  _removeTile: function (key) {
  	this.fire('tileRemoved', this._tiles[key]);
  	delete this._tiles[key];
  	delete this._tilesLoading[key];
  },

  _tileKey: function(tilePoint) {
  	return tilePoint.x + ':' + tilePoint.y + ':' + tilePoint.zoom;
  },

  _tileShouldBeLoaded: function (tilePoint) {
  	var k = this._tileKey(tilePoint);
  	return !(k in this._tiles) && !(k in this._tilesLoading);
  },

  _tileLoaded: function(tilePoint, tileData) {
  	this._tilesToLoad--;
  	var k = tilePoint.x + ':' + tilePoint.y + ':' + tilePoint.zoom
  	this._tiles[k] = tileData;
  	delete this._tilesLoading[k];
  	if(this._tilesToLoad === 0) {
  		this.fire("tilesLoaded");
  	}
  },

  _getTilePos: function (tilePoint) {
  	tilePoint = new L.Point(tilePoint.x, tilePoint.y);
  	var origin = this._map._getNewTopLeftPoint(this._map.getCenter()),
  	tileSize = this.options.tileSize;

  	return tilePoint.multiplyBy(tileSize).subtract(origin);
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

  _addTilesFromCenterOut: function (bounds) {
  	var queue = [],
  	center = bounds.getCenter(),
  	zoom = this._map.getZoom();

  	var j, i, point;

  	for (j = bounds.min.y; j <= bounds.max.y; j++) {
  		for (i = bounds.min.x; i <= bounds.max.x; i++) {
  			point = new L.Point(i, j);
  			point.zoom =  zoom;

  			if (this._tileShouldBeLoaded(point)) {
  				queue.push(point);
  			}
  		}
  	}

  	var tilesToLoad = queue.length;

  	if (tilesToLoad === 0) { return; }

      // load tiles in order of their distance to center
      queue.sort(function (a, b) {
      	return a.distanceTo(center) - b.distanceTo(center);
      });

      this._tilesToLoad += tilesToLoad;

      for (i = 0; i < tilesToLoad; i++) {
      	var t = queue[i];
      	var k = this._tileKey(t);
      	this._tilesLoading[k] = t;
      	this.fire('tileAdded', t);
      }
      this.fire("tilesLoading");

  }
})