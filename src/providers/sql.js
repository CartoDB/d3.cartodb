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
  invalidateCache: function(){
    this.tileCache = {};
  }
};

module.exports = SQLProvider;