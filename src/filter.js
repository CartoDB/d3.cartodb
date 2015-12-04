var Crossfilter = require("crossfilter");

function Filter(){
  this.crossfilter = new Crossfilter();
  this.dimensions = {};
  this.tiles = new Set();
  this.report = {};
  this.expressions = {};
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

  addExpression: function(id, definition){
    var self = this;
    if(definition.type === "formula") {
      this.addFormula(id, definition);
    }

    else if(definition.type === "category") {
      this.addCategory(id, definition);
    }

    else if(definition.type === "histogram") {
      this.addHistogram(id, definition)
    }

  },

  filterRange: function(column, range){
    if (!this.dimensions[column]){
      this.dimensions[column] = this.crossfilter.dimension(function(f){return f.properties[column]});
    }
    this.dimensions[column].filter(range);
  },

  filterAccept: function(column, terms){
    if (!this.dimensions[column]){
      this.dimensions[column] = this.crossfilter.dimension(function(f){return f.properties[column]});
    }
    if (!(terms instanceof Array)){
      terms = [terms];
    }
    this.dimensions[column].filter(function(f){
      if (terms.indexOf(f) > -1){
        return true;
      }
    });
  },

  filterReject: function(column, terms){
    if (!this.dimensions[column]){
      this.dimensions[column] = this.crossfilter.dimension(function(f){return f.properties[column]});
    }
    if (!terms.length){
      terms = [terms];
    }
    this.dimensions[column].filter(function(f){
      if (terms.indexOf(f) === -1){
        return true;
      }
    });
  },

  clearFilters: function() {
    for (var column in this.dimensions){
      this.dimensions[column].filterAll();
    }
  },

  clearFilter: function(column) {
    this.dimensions[column].filterAll();
  },

  getValues: function(column) {
    return this.dimensions[column].top(Infinity);
  }

}

module.exports = Filter;