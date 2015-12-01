var Crossfilter = require("crossfilter");

function Filter(){
	this.crossfilter = new Crossfilter();
	this.dimensions = {};
	this.tiles = new Set();
};

Filter.prototype = {
	addTile: function(tilePoint, collection){
		if (this.tiles.has(tilePoint)) return;
		this.crossfilter.add(collection.features.map(function(f){
      f.properties.tilePoint = tilePoint.zoom + ":" + tilePoint.x + ":" + tilePoint.y;
      return f;
    }));
    this.tiles.add(tilePoint);
	},

	removeTile: function(tilePoint){
		if(!this.dimensions.tiles){
      return;
    }
    this.dimensions.tiles.filter(tilePoint);
    this.crossfilter.remove();
    this.dimensions.tiles.filterAll();
	},

	getTile: function(tilePoint){
		if(!this.dimensions.tiles){
      this.dimensions.tiles = this.crossfilter.dimension(function(f){return f.properties.tilePoint});
    }
    var tile = {type: "FeatureCollection", features: null};
    this.dimensions.tiles.filter(tilePoint);
    tile.features = this.dimensions.tiles.top(Infinity);
    this.dimensions.tiles.filterAll();
    return tile;
	},

}

module.exports = Filter;