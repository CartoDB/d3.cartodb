
d3.cartodb is an experiment to render cartodb visualizations using d3.

see an [example](http://cartodb.github.io/d3.cartodb/test.html) or go to the [viz.json
viewer](http://cartodb.github.io/d3.cartodb/vizjson_visor.html#https://osm2.cartodb.com/api/v2/viz/c217e650-c57f-11e4-848a-0e0c41326911/viz.json)  (just
change the viz.json url in the url)


## How to use it

Just create a leaflet map

```javascript
var map = new L.Map("map", { center: [0, 0], zoom: 3 })
d3.cartodb.viz(viz_json_url, function(err, layers) {
    // work with layer
});
```

## Documentation

You can find the library reference in [the doc directory](https://github.com/CartoDB/d3.cartodb/tree/gh-pages/doc).

## Development

This project uses npm and browserify. To install the dependencies use `npm install` and to build the dists just `make`.

We use Karma with Jasmine as our testing stack. To run the tests once, run `npm test`. To run them in a debug environment, with the Chrome developer tools available, run `make debugTest`.

## Notes on CartoCSS support

- Not all CartoCSS rules are supported. Comp-op, for instance, is not yet available.
- No more than one symbolizer is allowed per layer.
- There is some pretty basic text support.
