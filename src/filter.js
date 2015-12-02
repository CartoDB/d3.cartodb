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

    if(definition.type === "category") {
      this.addCategory(id, definition);
    }

  },

  addFormula: function(id, definition){
    var self = this;
    var expression = {result: {}, fn: null};
    var operations = {
      sum: function() { return self.crossfilter.groupAll().reduceSum(function(f){return f.properties[definition.column]}).value() },
      avg: function() { return self.crossfilter.groupAll().reduceSum(function(f){return f.properties[definition.column]}).value() / self.crossfilter.size() },
      count: function() { return self.crossfilter.size() },
      min: function() { return self.crossfilter.groupAll().reduce(function(e,v){if(v.properties[definition.column] < e) return v.properties[definition.column]; else return e;}, null, function(){return Infinity}).value()},
      max: function() { return self.crossfilter.groupAll().reduce(function(e,v){if(v.properties[definition.column] > e) return v.properties[definition.column]; else return e;}, null, function(){return -Infinity}).value()}
    };

    // This is the function that generates the report, i.e. what 
    expression.fn = function(){
      return {
        operation: definition.operation,
        result: operations[definition.operation](),
        nulls: 0, // TO DO!
        type: "formula"
      }
    };
    this.expressions[id] = expression;
  },

  addCategory: function(id, definition) {
    var self = this;
    var expression = {result: {}, fn: null};
    expression.dimension = this.crossfilter.dimension(function(f){ return f.properties[definition.column]});
    expression.fn = function(){
      return {
        categoriesCount: expression.dimension.groupAll().reduce(function(e,v){e.add(v.properties[definition.column]); return e;},null,function(){return new Set()}).value().size,
        min: expression.dimension.groupAll().reduce(function(e,v){if(v.properties[definition.column] < e) return v.properties[definition.column]; else return e;}, null, function(){return Infinity}).value()},
        max: expression.dimension.groupAll().reduce(function(e,v){if(v.properties[definition.column] > e) return v.properties[definition.column]; else return e;}, null, function(){return -Infinity}).value()},
        nulls: 0,

      }
    }
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