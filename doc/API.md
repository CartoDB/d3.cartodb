Traditionally, all types of visualisation in CartoDB, except for [Torque](https://github.com/cartodb/torque), have worked by our tile server turning data from a CartoDB table into PNG images in the form of tiles, which are displayed geographically in the browser, thanks to libraries like Leaflet or the Google Maps Javascript Library.

However, the current trend in the mapping world is a shift towards [**vector tiles**](http://wiki.openstreetmap.org/wiki/Vector_tiles). In this project we are experimenting with the use of d3 to receive GeoJSON tiles from CartoDB and generate the maps in the browser. This allows for more flexibility, lower use of bandwith, and more agile treatment of the map's data.

###d3.cartodb.js Documentation