var d3 = require("d3");

function XYZProvider(options) {
  this.format = options.format;
  this.tileCache = {};
  this.urlTemplate = options.urlTemplate;
}

XYZProvider.prototype = {
  getTile: function(tilePoint, callback){
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