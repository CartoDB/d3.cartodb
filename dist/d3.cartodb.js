(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.cartodb = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = {
	tile2lon: function(x,z) {
		return (x/Math.pow(2,z)*360-180);
	},
	tile2lat: function(y,z) {
		var n=Math.PI-2*Math.PI*y/Math.pow(2,z);
		return (180/Math.PI*Math.atan(0.5*(Math.exp(n)-Math.exp(-n))));
	},
  geo2Webmercator: function(x_lon, y_lat){
    if (Math.abs(x_lon) <= 180 && Math.abs(y_lat) < 90){
      // 0.017453292519943295 => Deg to rad constant
      var num = x_lon * 0.017453292519943295;
      // 6378137 => Earth radius
      var x = 6378137.0 * num;
      var a = y_lat * 0.017453292519943295;
      var x_mercator = x;
      var y_mercator = 3189068.5 * Math.log((1.0 + Math.sin(a)) / (1.0 - Math.sin(a)));
      return {x: x_mercator, y: y_mercator};
    }            
  }
            

};
},{}],2:[function(require,module,exports){
require('./tileloader.js');
require('./leaflet_d3.js');
module.exports.d3 = {
	Util: require('./util.js'),
	geo: require('./geo.js'),
	Renderer: require("./renderer.js"),
	net: require('./net.js')
};
},{"./geo.js":1,"./leaflet_d3.js":3,"./net.js":4,"./renderer.js":9,"./tileloader.js":10,"./util.js":11}],3:[function(require,module,exports){
var Renderer = require("./renderer");
var providers = require("./providers");

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
    if (this.options.urlTemplate){
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
    this._initTileLoader();
  },

  onRemove: function (map) {
    this._container.parentNode.removeChild(this._container);
  },

  addTo: function (map) {
    map.addLayer(this);
    return this;
  },

  loadTile: function (tilePoint) {
    var self = this;
    var tile = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    tile.setAttribute("class", "leaflet-tile");
    this._container.appendChild(tile);

    this.provider.getTile(tilePoint, function(tilePoint, geometry){
      self.renderer.render(tile, geometry, tilePoint);
      self._tileLoaded(tilePoint, tile);
    });

    var tilePos = this._getTilePos(tilePoint);
    tile.style.width = tile.style.height = this._getTileSize() + 'px';
    L.DomUtil.setPosition(tile, tilePos, L.Browser.chrome);
  },

  _initTileLoader: function() {
    this._tiles = {};
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
});
},{"./providers":5,"./renderer":9}],4:[function(require,module,exports){
(function (global){
//http://bl.ocks.org/tmcw/4494715
module.exports.jsonp = function (url, callback) {
  function rand() {
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
      c = '', i = -1;
    while (++i < 15) c += chars.charAt(Math.floor(Math.random() * 52));
    return c;
  }

  function create(url) {
    var e = url.match(/callback=(\w+)/),
      c = e ? e[1] : rand();
    window[c] = function(data) {
      callback(data);
      delete window[c];
      script.remove();
    };
    return c;
  }

  var cb = create(url),
    script = d3.select('head')
    .append('script')
    .attr('type', 'text/javascript')
    .attr('src', url.replace(/(\{|%7B)callback(\{|%7D)/, cb));
};

module.exports.get = function get(url, callback, options) {
  options = options || {
    method: 'GET',
    data: null,
    responseType: 'text'
  };
  lastCall = { url: url, callback: callback };
  var request = XMLHttpRequest;
  // from d3.js
  if (global.XDomainRequest
      && !("withCredentials" in request)
      && /^(http(s)?:)?\/\//.test(url)) request = XDomainRequest;

  var req = new request();
  req.open(options.method, url, true);


  function respond() {
    var status = req.status, result;
    var r = options.responseType === 'arraybuffer' ? req.response: req.responseText;
    if (!status && r || status >= 200 && status < 300 || status === 304) {
      callback(req);
    } else {
      callback(null);
    }
  }

  "onload" in req
    ? req.onload = req.onerror = respond
    : req.onreadystatechange = function() { req.readyState > 3 && respond(); };

  req.onprogress = function() {};

  req.responseType = options.responseType; //'arraybuffer';
  if (options.data) {
    req.setRequestHeader("Content-type", "application/json");
    //req.setRequestHeader("Content-type", "application/x-www-form-urlencoded")
    req.setRequestHeader("Accept", "*");
  }
  req.send(options.data);
  return req;
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],5:[function(require,module,exports){
module.exports = {
  SQLProvider: require('./sql.js'),
  XYZProvider: require('./xyz.js'),
  WindshaftProvider: require('./windshaft.js')
};
},{"./sql.js":6,"./windshaft.js":7,"./xyz.js":8}],6:[function(require,module,exports){
var d3 = require("d3");

function SQLProvider(options) {
  this.sql_api_template = options.sql_api_template || 'http://{user}.cartodb.com';
  this.user = options.user;
  this.table = options.table;
  this.format = options.format;
  this.tileCache = {};
}

SQLProvider.prototype = {
  getTile: function(tilePoint, callback){
    var tileData = this.tileCache[tilePoint.zoom + ":" + tilePoint.x + ":" + tilePoint.y];
    if (tileData) {
      callback(tilePoint, tileData);
    }
    else{

      var tileBB = {
        n: cartodb.d3.geo.tile2lat(tilePoint.y, tilePoint.zoom),
        s: cartodb.d3.geo.tile2lat(tilePoint.y + 1, tilePoint.zoom),
        e: cartodb.d3.geo.tile2lon(tilePoint.x, tilePoint.zoom),
        w: cartodb.d3.geo.tile2lon(tilePoint.x + 1, tilePoint.zoom),
      };
      var query = "SELECT * FROM " + this.table;
      query += " WHERE the_geom && ST_MakeEnvelope({w},{s},{e},{n}, 4326)";
      query = query
      .replace("{w}", tileBB.w)
      .replace("{s}", tileBB.s)
      .replace("{e}", tileBB.e)
      .replace("{n}", tileBB.n);

      this.getGeometry(query, tilePoint.zoom, function(geometry){
        this.tileCache[tilePoint.zoom + ":" + tilePoint.x + ":" + tilePoint.y] = geometry;
        callback(tilePoint, geometry);
      }.bind(this));
    }
  },

  _query: function(sql, callback, format) {
    var url = this.sql_api_template.replace('{user}', this.user);
    url += '/api/v2/sql?q=' + encodeURIComponent(sql);
    if (format) {
      url += "&format=" + format;
    }
    d3.json(url, callback);
  },

  getGeometry: function(sql, zoom, callback) {
    // request the schema fist to extract columns and generate the final
    // sql query with the right the_geom simplification for the zoom level.
    // The current zoom level may not the best but good enough for a test
    var schemaSQL = 'select * from (' + sql + ') __cdb limit 0';
    this._query(schemaSQL, function(data) {
      // generate the final sql. Ideally only variables used in cartocss
      // should be requested
      var columns = Object.keys(data.fields).filter(function(f) {
        return f !== 'the_geom' && f !== 'the_geom_webmercator';
      });

      // pixel size with some factor to avoid remove geometries
      var px = this.pixelSizeForZoom(zoom);
      var the_geom = 'st_transform(st_simplify(st_snaptogrid(the_geom_webmercator, {px}, {px}), {px}/2), 3857) as the_geom'.replace(/{px}/g, px);
      // generate the sql with all the columns + the geometry simplified
      var finalSQL = "select " + columns.join(',') + "," + the_geom + " FROM (" + sql + ") __cdb";

      this._query(finalSQL, function(collection) {
        collection.features = collection.features.filter(function(d) {
          return d.geometry && d.geometry.coordinates.length > 0;
        });
        callback(collection);
      }, 'geojson');
    }.bind(this));
  },

  pixelSizeForZoom: function(zoom) {
    var earth_circumference = 40075017;
    var tile_size = 256;
    var full_resolution = earth_circumference/tile_size;
    return full_resolution / Math.pow(2,zoom);
  },
};

module.exports = SQLProvider;
},{"d3":undefined}],7:[function(require,module,exports){
var d3 = require("d3");

function WindshaftProvider(options) {
	this.sql_api_template = options.sql_api_template || 'http://{user}.cartodb.com';
	this.user = options.user;
	this.table = options.table;
	this.format = options.format;
	this.tileCache = {};
}

WindshaftProvider.prototype = {

};
},{"d3":undefined}],8:[function(require,module,exports){
var d3 = require("d3");
var topojson = require('topojson');

function XYZProvider(options) {
  this.format = options.format;
  this.tileCache = {};
  this.urlTemplate = options.urlTemplate;
}

XYZProvider.prototype = {
  getTile: function(tilePoint, callback){
    var self = this;
    var tileData = this.tileCache[tilePoint.zoom + ":" + tilePoint.x + ":" + tilePoint.y];
    if (tileData) {
      callback(tilePoint, tileData);
    }
    else{
      var url = this.urlTemplate
                .replace("{x}", tilePoint.x)
                .replace("{y}", tilePoint.y)
                .replace("{z}", tilePoint.zoom);
      this.getGeometry(url, function(err, geometry){
        if(geometry.type === "Topology"){
          self.format = "topojson";
          geometry = topojson.feature(geometry, geometry.objects.vectile);
        }
        this.tileCache[tilePoint.zoom + ":" + tilePoint.x + ":" + tilePoint.y] = geometry;
        callback(tilePoint, geometry);
      }.bind(this));
    }
  },

  getGeometry: function(url, callback){
      d3.json(url, callback);
  }
}

module.exports = XYZProvider;
},{"d3":undefined,"topojson":undefined}],9:[function(require,module,exports){
(function (global){
var d3 = global.d3 || require('d3');
var cartodb = global.cartodb || {};
var carto = global.carto || require('carto');
var _ = global._ || require('underscore');
var geo = require("./geo");
topojson = require('topojson');

cartodb.d3 = {};

d3.selection.prototype.moveToFront = function() {
  return this.each(function(){
    this.parentNode.appendChild(this);
  });
};

var Renderer = function(options) {
  this.options = options;
  if (options.cartocss){
    this.setCartoCSS(options.cartocss);
  }
  this.globalVariables = {};
  this.user = options.user;
  this.layer = options.layer;
};

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
  setGlobal: function() {
    var args = Array.prototype.slice.call(arguments);
    if (args.length === 2) {
      this.globalVariables[args[0]] = args[1];
    } else {
      this.globalVariables = args[0];
    }
  },

  setCartoCSS: function(cartocss) {
    this.renderer = new carto.RendererJS();
    this.shader = this.renderer.render(cartocss);
  },
  

  // there are special rules for layers, for example "::hover", this function
  // search for them and attach to the original layer, so if you have
  // #test {}
  // #test::hover {}
  // this function will return an array with a single layer. That layer will contain a 
  // hover as an attribute
  processLayersRules: function(layers) {
    var specialAttachments = ['hover'];
    var realLayers = [];
    var attachments = [];
    // map layer names 
    var layerByName = {};
    layers.forEach(function(layer) {
      if (specialAttachments.indexOf(layer.attachment()) != -1) {
        attachments.push(layer);
      } else {
        layerByName[layer.name()] = layer;
        realLayers.push(layer);
      }
    });

    // link attachment with layers
    attachments.forEach(function(attachment) {
      var n = layerByName[attachment.name()];
      if (n) {
        n[attachment.attachment()] = attachment;
      } else {
        console.log("attachment without layer");
      }
    });

    return realLayers;
  },

  onMouseover: function(sym, path) {
      return function(d) {
        var t = d3.select(this);
        t.moveToFront();
        var trans_time = d.shader_hover['transition-time'];
        if (trans_time)
          t = t.transition().duration(trans_time);
        var old = path.pointRadius();
        path.pointRadius(function(d) {
         return (d.shader_hover['marker-width'] || 0)/2.0;
        });

        t.attr("d", path)
         .style(styleForSymbolizer(sym, 'shader_hover'));
        path.pointRadius(old);
      };
  },

  onMouseout: function(sym, path){
    return function(d) {
      var t = d3.select(this);
      var trans_time = d.shader_hover['transition-time'];
      if (trans_time)
        t = t.transition().duration(trans_time);
      t.attr("d", path)
        .style(styleForSymbolizer(sym, 'shader'));
    };
  },
  

  render: function(svg, collection, tilePoint) {
    var self = this;
    this.currentPoint = tilePoint;
    var shader = this.shader;
    svg = d3.select(svg);
    var g = svg.append("g").attr("class", "leaflet-zoom-hide");

    var transform = d3.geo.transform({ 
      point: function(x, y) {
          // don't use leaflet projection since it's pretty slow
          if(self.layer.provider.format === "topojson"){
            var webm = geo.geo2Webmercator(x,y);
            x = webm.x, y = webm.y;
          }
          var earthRadius = 6378137 * 2 * Math.PI;
          var earthRadius2 = earthRadius/2;
          var invEarth = 1.0/earthRadius;
          var pixelScale = 256 * (1 << tilePoint.zoom);
          x = pixelScale * (x + earthRadius2) * invEarth;
          y = pixelScale * (-y + earthRadius2) * invEarth;
          this.stream.point(x - self.currentPoint.x*256, y - self.currentPoint.y*256);
      }
    });
    path = d3.geo.path().projection(transform);
    
    if (!shader) return;
    if (!collection) return;
    var bounds = path.bounds(collection),
        buffer = 100,
        topLeft = bounds[0],
        bottomRight = bounds[1];
    topLeft[0] -= buffer;
    topLeft[1] -= buffer;

    var layers = shader.getLayers();

    // search for hovers and other special rules for the renderer
    layers = this.processLayersRules(layers);
    
    var styleLayers = g.data(layers);

    //            polygon line point
    // polygon       X     X     T
    // line                X     T
    // point               X     X


    styleLayers.each(function(layer) {
      var symbolizers = layer.getSymbolizers();
      symbolizers = _.filter(symbolizers, function(f) {
        return f !== '*';
      });

      // merge line and polygon symbolizers
      symbolizers = _.uniq(symbolizers.map(function(d) { return d === 'line' ? 'polygon': d; }));

      var sym = symbolizers[0];
      geometry = collection.features;

      // transform the geometry according the symbolizer
      var transform = transformForSymbolizer(sym);
      if (transform) {
        geometry = geometry.map(transform);
      }

      // select based on symbolizer
      var feature = d3.select(this)
          .selectAll("." + sym)
          .data(geometry);
          
      if (sym === 'text') {
        feature.enter().append("svg:text").attr('class', sym);
      } else {
        feature.enter().append("path").attr('class', sym);
      }
      feature.exit().remove();

      // calculate shader for each geometry
      feature.each(function(d) {
        d.properties.global = self.globalVariables;
        d.shader = layer.getStyle(d.properties, { zoom: tilePoint.zoom, time: self.time});
        if (layer.hover) {
          d.shader_hover = layer.hover.getStyle(d.properties, { zoom: tilePoint.zoom, time: self.time });
          _.defaults(d.shader_hover, d.shader);
        }
      });

      path.pointRadius(function(d) {
        return (d.shader['marker-width'] || 0)/2.0;
      });

      var f = feature;
      // move this outsude
      if (sym === 'text') {
        f.text(function(d) {
            return "text"; //d.shader['text-name']
        });
        f.attr("dy", ".35em");
        f.attr('text-anchor', "middle");
        f.attr("x", function(d) { 
            var p = this.layer.latLngToLayerPoint(d.geometry.coordinates[1], d.geometry.coordinates[0]);
            return p.x;
          });
        f.attr("y", function(d) { 
            var p = this.layer.latLngToLayerPoint(d.geometry.coordinates[1], d.geometry.coordinates[0]);
            return p.y;
         });

      } else {
        f.attr('d', path);
      }

      // TODO: this is hacky, not sure if transition can be done per feature (and calculate it), check d3 doc
      var trans_time = layer.getStyle({ global: self.globalVariables }, { zoom: tilePoint.zoom })['transition-time'];
      if (trans_time)
          f = f.transition().duration(trans_time);
      f.style(styleForSymbolizer(sym, 'shader'));
    });
    svg.attr("class", svg.attr("class") + " leaflet-tile-loaded");
  }
};

function styleForSymbolizer(symbolyzer, shaderName) {
  if (symbolyzer === 'polygon' || symbolyzer === 'line') {
    return {
      'fill': function(d) { return d[shaderName]['polygon-fill'] || 'none'; },
      'fill-opacity': function(d) { return d[shaderName]['polygon-opacity']; },
      'stroke': function(d) { return d[shaderName]['line-color']; },
      'stroke-width': function(d) { return d[shaderName]['line-width'] ;},
      'stroke-opacity': function(d) { return d[shaderName]['line-opacity']; }
    };
  } else if (symbolyzer === 'markers') {
    return {
      'fill': function(d) { return d[shaderName]['marker-fill'] || 'none'; },
      'fill-opacity': function(d) { return d[shaderName]['marker-fill-opacity']; },
      'stroke': function(d) { return d[shaderName]['marker-line-color']; },
      'stroke-width': function(d) { return d[shaderName]['marker-line-width']; }
    };
  } else if (symbolyzer === 'text') {
    return {
      'fill': function(d) { return d[shaderName]['text-fill'] || 'none'; },
    };

     /*.attr("x", function(d) { return d.cx; })
4                 .attr("y", function(d) { return d.cy; })
5                 .text( function (d) { return "( " + d.cx + ", " + d.cy +" )"; })
6                 .attr("font-family", "sans-serif")
7                 .attr("font-size", "20px")
8                 .attr("fill", "red");
*/
  }
}

function transformForSymbolizer(symbolizer) {
  if (symbolizer === 'markers' || symbolizer === 'labels') {
    var pathC = d3.geo.path().projection(function(d) { return d; });
    return function(d) {
      return d._centroid || (d._centroid = {
        type: 'Point',
        properties: d.properties,
        coordinates: pathC.centroid(d)
      });
    };
  }
  return null;
}

module.exports = Renderer;


}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./geo":1,"carto":undefined,"d3":undefined,"topojson":undefined,"underscore":undefined}],10:[function(require,module,exports){
L.Mixin.TileLoader = {

  _initTileLoader: function() {
    this._tiles = {};
    this._tilesLoading = {};
    this._tilesToLoad = 0;
    this._map.on({
        'moveend': this._updateTiles
    }, this);
    this._updateTiles();
  },

  _removeTileLoader: function() {
    this._map.off({
        'moveend': this._updateTiles
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
    var k = tilePoint.x + ':' + tilePoint.y + ':' + tilePoint.zoom;
    this._tiles[k] = tileData;
    delete this._tilesLoading[k];
    if(this._tilesToLoad === 0) {
      this.fire("tilesLoaded");
    }
  },

  _getTilePos: function (tilePoint) {
    tilePoint = new L.Point(tilePoint.x, tilePoint.y);
    var origin = this._map.getPixelOrigin(),
        tileSize = this._getTileSize();

    return tilePoint.multiplyBy(tileSize).subtract(origin);
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

};
},{}],11:[function(require,module,exports){
(function (global){
var d3 = global.d3 || require('d3');

module.exports = {

  viz: function(url, map, done) {
    cartodb.d3.net.jsonp(url + "?callback=vizjson", function(data) {
      map.setView(JSON.parse(data.center), data.zoom);
      // get base layer, not render anything in case of non ZXY layers
      var baseLayer = data.layers[0];
      if (baseLayer.options.urlTemplate) {
        map.addLayer(new L.TileLayer(baseLayer.options.urlTemplate, {
          subdomains: baseLayer.options.subdomains || 'abcd'
        }));
      } else if (baseLayer.options.color) {
        document.getElementById('map').style['background-color']= baseLayer.options.color;
      }
      
      // assume first layer is the one with cartodb data
      var cartodbLayer = data.layers[1];
      if (cartodbLayer.type === 'layergroup') {
        var layers = cartodbLayer.options.layer_definition.layers.map(function(layer) {
          return {
            // fix the \n in sql
            sql: layer.options.sql.replace(/\n/g, ' '),
            cartocss: layer.options.cartocss,
            table: layer.options.layer_name
          };
        });

        // for each layer generate a d3 layer
        layers.forEach(function(layer) {
        var lyr = new L.CartoDBd3Layer({
          user: cartodbLayer.options.user_name,
          table: layer.table,
          cartocss: layer.cartocss
        }).addTo(map);
        layer.mapLayer = lyr;
      });

      done(null, layers);
      } else {
        done(new Error("named maps not supported"));
      }
    });
  }
};


}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"d3":undefined}]},{},[2])(2)
});