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
  },

  invalidateCache: function(){
    this.tileCache = {};
  }
}

module.exports = XYZProvider;