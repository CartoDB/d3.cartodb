
d3.cartodb is an experiment to render cartodb visualizations using d3.

see an [example](http://cartodb.github.io/d3.cartodb/test.html) or go to the [viz.json
viewer](http://cartodb.github.io/d3.cartodb/vizjson_viewer.html#https://osm2.cartodb.com/api/v2/viz/c217e650-c57f-11e4-848a-0e0c41326911/viz.json)  (just
change the viz.json url in the url)


# how to use it

Just create a leaflet map

```javascript
var map = new L.Map("map", { center: [0, 0], zoom: 3 })
d3.cartodb.viz(viz_json_url, function(err, layers) {
    // work with layer
});
```

## low level api

This creates a leaflet layer

```javascript
var map = new L.Map("map", { center: [0, 0], zoom: 3 })
var layer = new d3.cartodb.Layer({
    user: 'rambo',
    sql_api_template: 'http://rambo.cartodb.com/'
});
layer.addTo(map);
layer.setSQL('select * form table');
layer.setCartoCSS('#test { marker-fill: red; }');
```


## API doc

### d3.cartodb.viz (vizjson_url, leaflet_map callback(err, layers)

Loads a viz.json and generate all the layers

limitations:

- for the momment only visualizations with all the tables public work
- you can't have more than a symbolizer per cartocss layer
- external resources don't work (polygon-pattern-file, marker-file and so on)


### d3.cartodb.Layer(options: Object)
options needs the user and optionally the sql_api_template

#### setSQL(sql: string)
Sets the SQL

#### setCartoCSS(cartocss: string)
Sets the cartocss

#### setGlobal
Changes a global variable in cartocss it can be used in carotcss in this way:
```
[prop < global.variableName] {...}
```

This function can be used passing an object with all the variables or just key value:

```
layer.setGlobal('test', 1)
layer.setGlobal({test: 1, bar: 3})
```
  
The layer will be refreshed after calling it.


## About cartocss

- cartocss is not fully supported, comp-op for example are not even taken into account.
- ::hover and transition-time features are available, see test.html so see them working
- no more than one symbolizer is allowed per layer
- there is pretty basic text support
- carto parser version used is in this branch:
  https://github.com/cartodb/carto/tree/custom_functions

## Notes

- this probably needs to be split in different modules:
    - d3.cartocss
    - d3.cartodbleaflet
    - d3.cartodbgmaps

- didn't have time to properly add tests, a build system based on browserify
