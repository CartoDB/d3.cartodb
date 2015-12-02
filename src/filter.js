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
    if(definition.type === "formula"){
        this.addFormula(id, definition);
    }

    if(definition.type === "filter"){
      var functions = {
        category: function(){
          this.crossfilter.dimension(function(f){return f[definition.options.column]});
        },
        range: function(){
          this.crossfilter.dimension(function(f){return f[definition.options.column]});
        }
      }
    }

  },

  addFormula: function(id, definition){
    var self = this;
    var expression = {result: {}, fn: null};
    expression.fn = function(){
      return {
        operation: definition.options.operation,
        result: {
          sum: function(){ return self.crossfilter.groupAll().reduceSum(function(f){return f.properties[definition.options.column]}).value() },
          avg: function(){ return self.crossfilter.groupAll().reduceSum(function(f){return f.properties[definition.options.column]}).value() / self.crossfilter.size() },
          count: function(){ return self.crossfilter.size() },
          min: function() { return self.crossfilter.groupAll().reduce(function(e,v){if(v.properties.pop_max < e) return v.properties.pop_max; else return e;}, null, function(){return Infinity}).value()},
          max: function() { return self.crossfilter.groupAll().reduce(function(e,v){if(v.properties.pop_max > e) return v.properties.pop_max; else return e;}, null, function(){return -Infinity}).value()}
        }[definition.options.operation](),
        nulls: 0,
        type: "formula"
      }
    };
    this.expressions[id] = expression;
  },

  update: function(){
    for (var k in this.expressions){
      this.expressions[k].result = this.report[k] = this.expressions[k].fn();
    }
    return this.report;
  }

}

module.exports = Filter;