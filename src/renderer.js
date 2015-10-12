var d3 = require('d3');
var cartodb = cartodb || {};

cartodb.d3 = {}

d3.selection.prototype.moveToFront = function() {
  return this.each(function(){
    this.parentNode.appendChild(this);
  });
};


// fetchs a viz.json, create the layers and add them to the map
function viz(url, map, done) {
  d3.jsonp(url + "?callback=vizjson", function(data) {

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
          cartocss: layer.options.cartocss
        }
      });

      // for each layer generate a d3 layer
      layers.forEach(function(layer) {
       var lyr = new Renderer({
         user: cartodbLayer.options.user_name,
         sql_api_template: cartodbLayer.options.sql_api_template
       }).addTo(map);
       lyr.setSQL(layer.sql);
       lyr.setCartoCSS(layer.cartocss);
       layer.mapLayer = lyr;
      });

      done(null, layers);

    } else {
      // viz.json not a layergroup
      done(new Error("named maps not supported"));
    }
  });
}
function styleForSymbolizer(symbolyzer, shaderName) {
  if (symbolyzer === 'polygon' || symbolyzer === 'line') {
    return {
      'fill': function(d) { return d[shaderName]['polygon-fill'] || 'none'; },
      'fill-opacity': function(d) { return d[shaderName]['polygon-opacity'] },
      'stroke': function(d) { return d[shaderName]['line-color'] },
      'stroke-width': function(d) { return d[shaderName]['line-width'] },
      'stroke-opacity': function(d) { return d[shaderName]['line-opacity'] }
    }
  } else if (symbolyzer === 'markers') {
    return {
      'fill': function(d) { return d[shaderName]['marker-fill'] || 'none'; },
      'fill-opacity': function(d) { return d[shaderName]['marker-fill-opacity'] },
      'stroke': function(d) { return d[shaderName]['marker-line-color'] },
      'stroke-width': function(d) { return d[shaderName]['marker-line-width'] }
    }
  } else if (symbolyzer === 'text') {
    return {
      'fill': function(d) { return d[shaderName]['text-fill'] || 'none'; },
    }

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
      })
    };
  }
  return null;
}

Renderer = L.Class.extend({

  initialize: function(options) {
    this.options = options;
    if (options.cartocss){
      this.setCartoCSS(options.cartocss);
    }
    this.collection = null;
    this.globalVariables = {}
    this.user = options.user;
    this.sql_api_template = options.sql_api_template || 'http://{user}.cartodb.com';
  }, 

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
      this.globalVariables = args[0]
    }
    this._reset();
  },

  addTo: function (map) {
    map.addLayer(this);
    return this;
  },

  onAdd: function (map) {
    this._map = map;

    map.on('viewreset', this._reset, this);
    map.on('zoomstart', function() { this.geometryDirty = true }, this);
    map.on('zoomend', function() { this.geometryDirty = true }, this);
    this._reset();
  },

  onRemove: function (map) {
    map.getPanes().overlayPane.removeChild(this.svg);
    map.off('viewreset', this._reset, this);
  },

  _addFunctions: function() {
    var self = this;
    var tmpl = _.template('select unnest(<%= functionName %>(array_agg(<%= simplify_fn %>((<%= column %>::numeric))), <%= slots %>)) as buckets from (<%= sql %>) _table_sql where <%= column %> is not null');

    this.renderer.addFunction('quantile', function (args, done) {
      var max = args[2].value[0].value;
      var min = args[1].value[0].value;
      self._query(
        tmpl({
          slots: 5,
          sql: self.sql,
          column: args[0].value[0].value,
          functionName: 'CDB_QuantileBins',
          simplify_fn: 'distinct'
        }), 
        function(data) {
          var buckets = _(data.rows).pluck('buckets');
          // generate javascript code that returns the value for each slot
          var code = 'var v = {v};';
          for (var i = 0; i < buckets.length; ++i) {
            code += 'if (v < ' + buckets[i] + ') return ' +  (min + (max - min)*i/(buckets.length - 1)) + ";"
          }
          code += "return " + max;

          done(function(v) {
             return {
                is: 'custom',
                toString: function() {
                  var c = code.replace(/{v}/, "data['" + v.value + "']");
                  return "(function() { " + c + " })();";
                }
             }
          });
        }
      );
    });
  },

  setCartoCSS: function(cartocss) {
    this.renderer = new carto.RendererJS();
    this._addFunctions();
    this.renderer.render(cartocss, function(err, shader) {
      this.shader = shader;
      this._reset()
    }.bind(this));
  },

  _reset: function(){

  },

  drawTile: function(tile, tilePoint){
    var self = this;
    function tile2lon(x,z) {
      return (x/Math.pow(2,z)*360-180);
    };
    function tile2lat(y,z) {
      var n=Math.PI-2*Math.PI*y/Math.pow(2,z);
      return (180/Math.PI*Math.atan(0.5*(Math.exp(n)-Math.exp(-n))));
    };
    var tileBB = {
      n: tile2lat(tilePoint.y, tilePoint.zoom),
      s: tile2lat(tilePoint.y + 1, tilePoint.zoom),
      e: tile2lon(tilePoint.x, tilePoint.zoom),
      w: tile2lon(tilePoint.x + 1, tilePoint.zoom),
    }
    var query = "SELECT * FROM " + this.options.table;
    query += " WHERE the_geom && ST_MakeEnvelope({w},{s},{e},{n}, 4326)";
    query = query
      .replace("{w}", tileBB.w)
      .replace("{s}", tileBB.s)
      .replace("{e}", tileBB.e)
      .replace("{n}", tileBB.n);

    this.getGeometry(query, tilePoint.zoom, function(geometry){
      self.render(tile, geometry);
    });
  },

  getGeometry: function(sql, zoom, callback) {
    var self = this;
    this.sql = sql;
    this.geometryDirty = true;
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

      var geometryZoom = zoom !== undefined ? zoom: self._map.getZoom();
      // pixel size with some factor to avoid remove geometries
      var px = self.pixelSizeForZoom(geometryZoom);
      var the_geom = 'st_transform(st_simplify(st_snaptogrid(the_geom_webmercator, {px}, {px}), {px}/2), 3857) as the_geom'.replace(/{px}/g, px);
      // generate the sql with all the columns + the geometry simplified
      var finalSQL = "select " + columns.join(',') + "," + the_geom + " FROM (" + sql + ") __cdb";

      self._query(finalSQL, function(collection) {
        collection.features = collection.features.filter(function(d) {
          return d.geometry && d.geometry.coordinates.length > 0
        })
        callback(collection)
      }, 'geojson');
    });
  },

  _query: function(sql, callback, format) {
    var url = this.sql_api_template.replace('{user}', this.user);
    url += '/api/v2/sql?q=' + encodeURIComponent(sql);
    if (format) {
      url += "&format=" + format;
    }
    d3.json(url, callback);
  },

  pixelSizeForZoom: function(zoom) {
    var earth_circumference = 40075017;
    var tile_size = 256;
    var full_resolution = earth_circumference/tile_size;
    return full_resolution / Math.pow(2,zoom);
  },

  // there are special rules for layers, for example "::hover", this function
  // search for them and attach to the original layer, so if you have
  // #test {}
  // #test::hover {}
  // this function will return an array with a single layer. That layer will contain a 
  // hover as an attribute
  processLayersRules: function(layers) {
    var specialAttachments = ['hover'];
    var realLayers = []
    var attachments = []
    // map layer names 
    var layerByName = {}
    layers.forEach(function(layer) {
      if (specialAttachments.indexOf(layer.attachment()) != -1) {
        attachments.push(layer);
      } else {
        layerByName[layer.name()] = layer;
        realLayers.push(layer);
      }
    })

    // link attachment with layers
    attachments.forEach(function(attachment) {
      var n = layerByName[attachment.name()]
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
        var t = d3.select(this)
        t.moveToFront();
        var trans_time = d.shader_hover['transition-time']
        if (trans_time)
          t = t.transition().duration(trans_time);
        var old = path.pointRadius();
        path.pointRadius(function(d) {
         return (d.shader_hover['marker-width'] || 0)/2.0;
        });

        t.attr("d", path)
         .style(styleForSymbolizer(sym, 'shader_hover'))
        path.pointRadius(old);
      }
  },

  onMouseout: function(sym, path){
    return function(d) {
      var t = d3.select(this)
      var trans_time = d.shader_hover['transition-time']
      if (trans_time)
        t = t.transition().duration(trans_time);
      t.attr("d", path)
        .style(styleForSymbolizer(sym, 'shader'))
    }
  },

  render: function(svg, collection) {
    var self = this;
    var shader = this.shader;
    svg = d3.select(svg);
    var g = svg.append("g").attr("class", "leaflet-zoom-hide");

    var transform = d3.geo.transform({ 
      point: function(x, y) {
        var coord = webmercator2LL(x,y);
        function long2px(lon,zoom) { return ((lon+180)/360*Math.pow(2,zoom)) - Math.floor((lon+180)/360*Math.pow(2,zoom)); }
        function lat2px(lat,zoom)  { return ((1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2 *Math.pow(2,zoom)) - Math.floor((1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2 *Math.pow(2,zoom)); }
        var pixelPos = {x: long2px(coord.lon, map.getZoom()), y: lat2px(coord.lat, map.getZoom())}
          // don't use leaflet projection since it's pretty slow
          // var earthRadius = 6378137 * 2 * Math.PI;
          // var earthRadius2 = earthRadius/2;
          // var invEarth = 1.0/earthRadius;
          // var pixelScale = 256 * (1 << map.getZoom());
          // x = pixelScale * (x + earthRadius2) * invEarth;
          // y = pixelScale * (-y + earthRadius2) * invEarth;
          // var topleft = {x: parseInt(svg.style("left").replace("px", "")), y: parseInt(svg.style("top").replace("px", ""))};
        this.stream.point(256*pixelPos.x, 256*pixelPos.y);
      }
    });
    path = d3.geo.path().projection(transform);
    
    if (!shader) return;
    if (!collection) return;

    if (this.geometryDirty) {
      var bounds = path.bounds(this.collection),
          buffer = 100;
          topLeft = bounds[0],
          bottomRight = bounds[1];
          topLeft[0] -= buffer;
          topLeft[1] -= buffer;

      svg.attr("width", bottomRight[0] - topLeft[0] + buffer)
          .attr("height", bottomRight[1] - topLeft[1] + buffer)
          .style("left", topLeft[0] + "px")
          .style("top", topLeft[1] + "px");

      g.attr("transform", "translate(" + -topLeft[0] + "," + -topLeft[1] + ")");
      this.geometryDirty = false;
    }

    var layers = shader.getLayers();

    // search for hovers and other special rules for the renderer
    layers = this.processLayersRules(layers)
    
    var styleLayers = g.selectAll("g.layer")
        .data(layers)
      
    styleLayers.enter()
      .append("g")
      .attr('class', 'layer')
    styleLayers.exit().remove()

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
      symbolizers = _.uniq(symbolizers.map(function(d) { return d === 'line' ? 'polygon': d }));
      
      if (symbolizers.length > 1) throw new Error("one symbolizer is allowed per layer");

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
          .data(geometry)
          
      if (sym === 'text') {
        feature.enter().append("svg:text").attr('class', sym);
      } else {
        feature.enter().append("path").attr('class', sym);
      }
      feature.exit().remove();

      // calculate shader for each geometry
      feature.each(function(d) {
        d.properties.global = self.globalVariables;
        d.shader = layer.getStyle(d.properties, { zoom: map.getZoom(), time: self.time})
        if (layer.hover) {
          d.shader_hover = layer.hover.getStyle(d.properties, { zoom: map.getZoom(), time: self.time })
          _.defaults(d.shader_hover, d.shader);
        }
      })

      path.pointRadius(function(d) {
        return (d.shader['marker-width'] || 0)/2.0;
      });

      var f = feature
      // move this outsude
      if (sym === 'text') {
        f.text(function(d) {
            return "text"; //d.shader['text-name']
        });
        f.attr("dy", ".35em")
        f.attr('text-anchor', "middle")
        f.attr("x", function(d) { 
            var p = map.latLngToLayerPoint(
              new L.LatLng(
                d.geometry.coordinates[1],
                d.geometry.coordinates[0]
              )
            )
            return p.x
          });
        f.attr("y", function(d) { 
            var p = map.latLngToLayerPoint(
              new L.LatLng(
                d.geometry.coordinates[1],
                d.geometry.coordinates[0]
              )
            )
            return p.y;
         })

      } else {
        f.attr('d', path);
      }

      if (layer.hover) {
        f.on('mouseover', self.onMouseover(sym, path))
        f.on('mouseout', self.onMouseout(sym, path));
        // this is the other way to do the hover, chaging the style for all the layers
        // (which btw is more closer to the concept of layer that cartocss defines)
        /*
        f.on('mouseover', function() {
          f.style(styleForSymbolizer(sym, 'shader_hover'));
        });
        f.on('mouseout', function() {
          f.style(styleForSymbolizer(sym, 'shader'));
        });
        */
      }
      // TODO: this is hacky, not sure if transition can be done per feature (and calculate it), check d3 doc
      var trans_time = layer.getStyle({ global: self.globalVariables }, { zoom: self._map.getZoom() })['transition-time']
      if (trans_time)
          f = f.transition().duration(trans_time);
      f.style(styleForSymbolizer(sym, 'shader'))
    })
    svg.attr("class", svg.attr("class") + " leaflet-tile-loaded");
  }
});

function webmercator2LL(x,y) {
    if (Math.abs(x) < 180 && Math.abs(y) < 90)
        return;

    if ((Math.abs(x) > 20037508.3427892) || (Math.abs(y) > 20037508.3427892))
        return;
    var num3 = x / 6378137.0;
    var num4 = num3 * 57.295779513082323;
    var num5 = Math.floor(((num4 + 180.0) / 360.0));
    var num6 = num4 - (num5 * 360.0);
    var num7 = 1.5707963267948966 - (2.0 * Math.atan(Math.exp((-1.0 * y) / 6378137.0)));
    return {lon: num6, lat: num7 * 57.295779513082323}
}

module.exports.renderer = Renderer;
cartodb.d3.viz = viz;
cartodb.d3.Renderer = Renderer;

