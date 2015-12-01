module.exports = L.Class.extend({

  includes: L.Mixin.Events,

  initialize: function(options) {
    this.options = options;
    this._map = options.map;
    this._tiles = {};
    this._tilesLoading = {};
    this._tilesToLoad = 0;
    this._map.on({
      'moveend': this._updateTiles
    }, this);
    // this._updateTiles();
  },

  _updateTiles: function () {
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
      var t = queue[i];
      var k = this._tileKey(t);
      this._tilesLoading[k] = t;
      this.fire('tileAdded', t);
    }
    this.fire("tilesLoading");
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

  _removeTileLoader: function() {
    this._map.off({
      'moveend': this._updateTiles
    }, this);
    this._removeTiles();
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

  _removeTile: function (key) {
    this.fire('tileRemoved', this._tiles[key]);
    delete this._tiles[key];
    delete this._tilesLoading[key];
  },

  _tileShouldBeLoaded: function (tilePoint) {
    var k = this._tileKey(tilePoint);
    return !(k in this._tiles) && !(k in this._tilesLoading);
  },

  _tileKey: function(tilePoint) {
    return tilePoint.x + ':' + tilePoint.y + ':' + tilePoint.zoom;
  },

  _tileLoaded: function(tilePoint, tileData) {
    this._tilesToLoad--;
    var k = tilePoint.x + ':' + tilePoint.y + ':' + tilePoint.zoom;
    this._tiles[k] = tileData;
    delete this._tilesLoading[k];
    if(this._tilesToLoad === 0) {
      this.fire("tilesLoaded");
    }
  },

  getTile: function(tilePoint) {
    return this._tiles[tilePoint.zoom + ":" + tilePoint.x + ":" + tilePoint.y];
  }
});