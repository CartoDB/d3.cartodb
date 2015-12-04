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

  // addFormula: function(id, definition){
  //   var self = this;
  //   var expression = {result: {}, fn: null};
  //   var operations = {
  //     sum: function() { return self.crossfilter.groupAll().reduceSum(function(f){return f.properties[definition.column]}).value() },
  //     avg: function() { return self.crossfilter.groupAll().reduceSum(function(f){return f.properties[definition.column]}).value() / self.crossfilter.size() },
  //     count: function() { return self.crossfilter.size() },
  //     min: function() { return self.crossfilter.groupAll().reduce(function(e,v){if(v.properties[definition.column] < e) return v.properties[definition.column]; else return e;}, null, function(){return Infinity}).value()},
  //     max: function() { return self.crossfilter.groupAll().reduce(function(e,v){if(v.properties[definition.column] > e) return v.properties[definition.column]; else return e;}, null, function(){return -Infinity}).value()}
  //   };

  //   // This is the function that generates the report, i.e. what 
  //   expression.fn = function(cf){
  //     return {
  //       operation: definition.operation,
  //       result: operations[definition.operation](),
  //       nulls: 0, // TO DO!
  //       type: "formula"
  //     }
  //   };
  //   this.expressions[id] = expression;
  // },

  // addCategory: function(id, definition) {
  //   var self = this;
  //   var expression = {result: {}, fn: null};
  //   expression.dimension = this.crossfilter.dimension(function(f){ return f.properties[definition.column]});
  //   expression.fn = function(cf){
  //     var cats = this.dimension.group().reduce(function(e,v){ if (e[v.properties[definition.column]]){ e[v.properties[definition.column]].value++;} else { e[v.properties[definition.column]] = {value: 1, agg: false} } return e; }, null, function(){return {}}).order(function(d) { return d[Object.keys(d)[0]].value }).top(5);
  //     cats = cats.map(function(f){return {"category": f.key, agg: false, value: f.value[f.key].value}});
  //     return {
  //       count: cf.size(),
  //       categoriesCount: this.dimension.groupAll().reduce(function(e,v){e.add(v.properties[definition.column]); return e;},null,function(){return new Set()}).value().size,
  //       min: this.dimension.groupAll().reduce(function(e,v){
  //           if(v.properties[definition.column] < e) return v.properties[definition.column]; 
  //           else return e;
  //         }, null, function(){return Infinity})
  //       .value(),
  //       max: this.dimension.groupAll().reduce(function(e,v){
  //           if(v.properties[definition.column] > e) return v.properties[definition.column]; 
  //           else return e;
  //         }, null, function(){return -Infinity})
  //       .value(),
  //       nulls: 0,
  //       type: "aggregation",
  //       categories: cats
  //     }
  //   }
  //   this.expressions[id] = expression;
  // },

  // addHistogram: function(id, definition) {
  //   var self = this;
  //   var expression = {result: {}, fn: null};
  //   expression.dimension = this.crossfilter.dimension(function(f){ return f.properties[definition.column]});
  //   expression.fn = function(cf){

  //     return {
  //       bin_width: "", 
  //       bins_count: "",
  //       nulls: 0,
  //       avg: "",
  //       bins: [

  //       ]
  //     }
  //   }
  //   this.expressions[id] = expression;
  // },

  // update: function(){
  //   for (var k in this.expressions){
  //     this.expressions[k].result = this.report[k] = this.expressions[k].fn(this.crossfilter);
  //   }
  //   return this.report;
  // }

}

module.exports = Filter;