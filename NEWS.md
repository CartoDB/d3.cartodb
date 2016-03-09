### 1.0.1
* Improved event latlng calculation
* Simplified logic of bounding box filtering
* Fixed line opacity
* Added dashed line capability
* Improved tests
* Added capability to specify own key id
* Lines and polygons are filtrable with bounding boxes

### 1.0.0
* Fixed multiple issues with DOM manipulation
* Started support of async layer add/removal
* SVG tile overzoom
* Now pending tile requests are canceled when zoom is changed or we don't need them
* Added filter events
* Filter only returns unique features
* Changed logic of filters to adapt widgets better
* Added statistical methods to filter
* Features return correspond only to current bounding box
* Reduces projection calculations
* Fixed vizjson visor
* Windshaft provider now accepts a layer definition
* Fixed multiple rendering glitches
* Fixed multi css layers
* Changef featureover event to mousemove
* Added minimal text rendering support
* General stability fixes

### 0.3.2
* Added support for individual marker widths
* Fixed issue where events would be replicated across points out of bounds
* Fixed rendering of tiles with the wrong zoom level
* Added tile overzooming
* Added composite operations support

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