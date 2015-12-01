var d3 = global.d3 || require('d3');
var cartodb = global.cartodb || {};
var carto = global.carto || require('carto');
var _ = global._ || require('underscore');
var geo = require("./geo");
var Filter = require("./filter");
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
  this.layer = options.layer;
  this.filter = new Filter();
  this.dimensions = {};
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
    if (this.layer){
      for (var tileKey in this.layer._tiles){
        var tilePoint = tileKey.split(":");
        tilePoint = {x: tilePoint[0], y: tilePoint[1], zoom: tilePoint[2]};
        this.render(this.layer._tiles[tileKey], null, tilePoint);
      }
    }
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

  styleForSymbolizer: function(symbolyzer, shaderName) {
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
  },
  

  render: function(svg, collection, tilePoint, updating) {
    var self = this;
    this.filter.addTile(tilePoint, collection); // It won't add duplicates
    this.currentPoint = tilePoint;
    var shader = this.shader;
    var g, cached = false, styleLayers;
    svgSel = d3.select(svg);
    if(updating) {
      collection = {features: d3.selectAll(svg.firstChild.children).data()};
      g = d3.select(svg.firstChild);
      styleLayers = g.data();
      cached = true;
    }
    else {
      g = svgSel.append("g").attr("class", "leaflet-zoom-hide");
    }

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
    if (!collection || collection.features.length === 0) return;
    var bounds = path.bounds(collection),
        buffer = 100,
        topLeft = bounds[0],
        bottomRight = bounds[1];
    topLeft[0] -= buffer;
    topLeft[1] -= buffer;

    var layers = shader.getLayers();

    // search for hovers and other special rules for the renderer
    layers = this.processLayersRules(layers);
    
    styleLayers = g.data(layers);

    //            polygon line point
    // polygon       X     X     T
    // line                X     T
    // point               X     X
    if (collection) {
    styleLayers.each(function(layer) {
      var symbolizers = layer.getSymbolizers();
      symbolizers = _.filter(symbolizers, function(f) {
        return f !== '*';
      });
      // merge line and polygon symbolizers
      symbolizers = _.uniq(symbolizers.map(function(d) { return d === 'line' ? 'polygon': d; }));
      var sym = symbolizers[0];
      geometry = collection.features;
      if(!updating){
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
      }
       else{
        feature = d3.select(this).selectAll("." + sym);
      }

        // calculate shader for each geometry
        feature.each(function(d) {
          if(!d.properties) d.properties = {};
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

        // move this outsude
        if (sym === 'text') {
          feature.text(function(d) {
              return "text"; //d.shader['text-name']
          });
          feature.attr("dy", ".35em");
          feature.attr('text-anchor', "middle");
          feature.attr("x", function(d) { 
              var p = this.layer.latLngToLayerPoint(d.geometry.coordinates[1], d.geometry.coordinates[0]);
              return p.x;
            });
          feature.attr("y", function(d) { 
              var p = this.layer.latLngToLayerPoint(d.geometry.coordinates[1], d.geometry.coordinates[0]);
              return p.y;
           });

        } else {
          feature.attr('d', path);
        }
      
     

      // TODO: this is hacky, not sure if transition can be done per feature (and calculate it), check d3 doc
      if(cached){
        feature = feature.transition().duration(200);
      }
      feature.style(self.styleForSymbolizer(sym, 'shader'));
    });
    svgSel.attr("class", svgSel.attr("class") + " leaflet-tile-loaded");
  }}
};



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

