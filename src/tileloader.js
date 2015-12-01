module.exports = L.Class.extend({

  includes: L.Mixin.Events,

  initialize: function(options) {
    this.options = options;
    this.provider = options.provider;
    this._map = options.map;
    this._tiles = {};
    this._tilesLoading = {};
    this._tilesToLoad = 0;
    this._map.on('moveend', this._reloadTiles, this);
    this._map.on('zoomstart', this._invalidateProviderCache, this);
  },

  loadTiles: function() {
    this._reloadTiles();
  },

  _reloadTiles: function() {
    if (!this._map) {
      return;
    }

    var bounds = this._map.getPixelBounds();
    var zoom = this._map.getZoom();
    var tileSize = this.options.tileSize;

    if (zoom > this.options.maxZoom || zoom < this.options.minZoom) {
      return;
    }

    var nwTilePoint = new L.Point(
      Math.floor(bounds.min.x / tileSize),
      Math.floor(bounds.min.y / tileSize)
    );
    var seTilePoint = new L.Point(
      Math.floor(bounds.max.x / tileSize),
      Math.floor(bounds.max.y / tileSize)
    );
    var tileBounds = new L.Bounds(nwTilePoint, seTilePoint);

    this._addTilesFromCenterOut(tileBounds);
    this._removeOtherTiles(tileBounds);
  },

  _addTilesFromCenterOut: function (bounds) {
    var queue = [];
    var center = bounds.getCenter();
    var zoom = this._map.getZoom();

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

    if (tilesToLoad === 0) {
      return;
    }

    // load tiles in order of their distance to center
    queue.sort(function (a, b) {
      return a.distanceTo(center) - b.distanceTo(center);
    });

    this._tilesToLoad += tilesToLoad;

    for (i = 0; i < tilesToLoad; i++) {
      this._loadTile(queue[i]);
    }
    this.fire("tilesLoading");
  },

  _loadTile: function(tilePoint) {
    var tileKey = this._tileKey(tilePoint);
    this._tilesLoading[tileKey] = tilePoint;
    this._tilesToLoad--;

    this.provider.getTile(tilePoint, function(tilePoint, geometry) {
      var tileKey = this._tileKey(tilePoint);
      this._tiles[tileKey] = true;
      delete this._tilesLoading[tileKey];
      this.fire('tileAdded', { tilePoint: tilePoint, geometry: geometry} );
      if(this._tilesToLoad === 0) {
        this.fire("tilesLoaded");
      }
    }.bind(this));
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

  _invalidateProviderCache: function() {
    this.provider.invalidateCache();
  },

  unbindAndClearTiles: function() {
    this._map.off('moveend', this._reloadTiles, this);
    this._map.off('zoomstart', this._invalidateProviderCache, this);
    this._removeTiles();
  },

  _removeTiles: function (bounds) {
    for (var key in this._tiles) {
      this._removeTile(key);
    }
  },

  _removeTile: function (key) {
    this.fire('tileRemoved', { tileKey: key });
    delete this._tiles[key];
    delete this._tilesLoading[key];
  },

  _tileShouldBeLoaded: function (tilePoint) {
    var k = this._tileKey(tilePoint);
    return !(k in this._tiles) && !(k in this._tilesLoading);
  },

  _tileKey: function(tilePoint) {
    return tilePoint.x + ':' + tilePoint.y + ':' + tilePoint.zoom;
  }
});