# API Methods

###`L.CartoDBd3Layer(options)`

A layer to be added to a Leaflet map. It works as a regular tiled layer within the Leaflet tile pane, but instead of containing `<img>` elements, it's composed of 256px square `<svg>` elements.

*example*

```javascript
var layer = new L.CartoDBd3Layer({
	user: 'fdansv',
	table: 'snow',
	cartocss: '<cartocss here>'
});
```
#### Arguments

* **options**
	* **user** : CartoDB user from which to pull the table.
	* **table**: name of the table to use.
	* **cartocss**: carto stylesheet string to use in this layer.
	* **renderer**: optional `cartodb.d3.Renderer` to be used instead of the default one.

#### Methods

* `addTo(L.Map)`
Adds the layer to a Leaflet map.
* `setCartoCSS(string)`
Passes the specified CartoCSS string to the layer's renderer and invalidates the svg tiles with the new style.
* `latLngToLayerPoint(number, number)`
Converts lat/lon values into pixel points within the layer.

###`cartodb.d3.Renderer(options)`

The vector tile renderer. Usually attached to a layer, it receives tilepoints, styles and raw svg elements in order to convert them to vector tiles using the [d3 visualisation library](http://d3js.org). It also contains internal query methods to get the appropriate GeoJSON tiles from the server.

#### Arguments

* **options**
	(All options from `L.CartoDBd3Layer` apply also here)
	* layer: the parent to which this renderer is attached.
	* sql_api_template: template the internal query method will use to ask for the data 

#### Methods

* `setGlobal()`
Changes a global variable in CartoCSS. It can be used passing an object with all the variables or just a key/value pair.
* `setCartoCSS(string)`
Passes the specified CartoCSS string to the layer's renderer and invalidates the svg tiles with the new style.

###`cartodb.d3.Util.viz(string, L.Map, function)`

A helper function that generates a CartoDB d3 layer from a viz.json URL. Using JSONP, it will turn the viz.json into one of more layers of svg tiles.

*example*

```javascript
var c = [40.71512685201709, -74.00201797485352];
var map = new L.Map("map", {center: c, zoom: 3});
cartodb.d3.Util.viz("https://fdansv.cartodb.com/api/v2/viz/5cac97a2-10ed-11e5-9cd8-0e4fddd5de28/viz.json", map, function(viz, layers){
	console.log("These are the layers! " + layers);
});

```

#### Arguments

* **url**: the URL for the viz.json *(bear in mind that the library doesn't currently support hidden tables/visualizations)*.
* **nao**: a Leaflet map to add the layer/s to.
* **done**: a callback method to run when the layers have been loaded.
