### 0.3.1
* Added interaction/mouse events
* Rendering refactor
* Fixed rendering outside bounds
* Fixed windshaft provider, loading queued tiles after mapconfig is parsed
* Geometries are now cut, so rendering is WAY faster and tiles WAY lighter

### 0.3.0
* Added multi layer support in one tile
* Added filtering via Crossfilter
* Added mouse interaction
* Replaced user/table support with Windshaft provider
* Added buffer-size support
* Major layer refactor
* Changed renderer behaviour so that geometries needn't be reloaded
* Added transitions
* Replaced jshint with standardjs

### 0.2.0
* Added updated documentation.
* Improved readme.
* Added test framework, using Karma.
* Added unit tests for layer and renderer.
* Added jshint to maintain code clean.
* Passed data retrieval to providers
* Added support for TopoJSON tiles.
* Adds XYZ support.

### 0.1.0

* Added browserify support.
* Geometries are now rendered as svg tiles, not as a whole dataset.
* Added package.json for dependencies.
* Added test framework.
* Supports loading vizs both with vizjson and user/table.