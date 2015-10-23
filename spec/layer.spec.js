describe("The layer", function(){
	beforeAll(function(){
		var d = document.createElement("div");
		d.setAttribute("id", "map");
		document.body.appendChild(d);
		var c = [40.71512685201709, -74.00201797485352];
		this.map = new L.Map("map", {center: c, zoom: 3});
		this.layer = new L.CartoDBd3Layer({
	    user: 'fdansv',
	    table: 'snow',
	    cartocss: "/** simple visualization */ #snow{ marker-fill-opacity: 0.9; marker-line-color: #FFF; marker-line-width: 1; marker-line-opacity: 1; marker-placement: point; marker-type: ellipse; marker-width: 10; marker-fill: #FF6600; marker-allow-overlap: true; }"
	  });
	});

	afterAll(function(){
		document.body.removeChild(document.getElementById('map'));
	});

	afterEach(function(){
		this.map.removeLayer(this.layer);
	})

	it("should have its dependencies loaded", function() {
		expect(d3).not.toEqual(undefined);
		expect(L).not.toEqual(undefined);
		expect(_).not.toEqual(undefined);
		expect(carto).not.toEqual(undefined);
	});

	it("shouldn't initialise renderer until layer is added to map", function(){
		expect(this.layer.renderer).toBeUndefined();
	});

	it("should init renderer when it's added to map", function(){
		this.layer.addTo(this.map);
		expect(this.layer.renderer).toBeDefined();
	});

	it("should generate an svg tile when tileAdded event is triggered", function(){
		this.layer.addTo(this.map);
		spyOn(this.layer.renderer, "drawTile");
		this.layer.fire("tileAdded", {x: 1, y: 2, zoom: 3});
		expect(this.layer.renderer.drawTile).toHaveBeenCalled();
		expect(this.layer.renderer.drawTile.calls.first().args[0].tagName).toEqual('svg')
	});

	it("'s container should have leaflet-specific classnames", function(){
		this.layer.addTo(this.map);
		expect(this.layer._container.attributes["class"].value).toEqual('leaflet-tile-container leaflet-zoom-animated');
		expect(this.layer._container.parentNode.attributes["class"].value).toEqual('leaflet-layer');
	});

	it("should run onRemove when layer is removed from map", function() {
		this.layer.addTo(this.map);
		spyOn(this.layer, "onRemove");
		this.map.removeLayer(this.layer);
		expect(this.layer.onRemove).toHaveBeenCalled;
	});

	// it("'s setCartoCSS should re-render the tiles", function(done){
	// 	this.layer.addTo(this.map);
	// 	var oldRender = this.layer.renderer.render;
	// 	this.layer.renderer.render = function(){
	// 		expect(true);
	// 		this.layer.renderer.render = oldRender;
	// 		done()
	// 	};
	// 	this.layer.setCartoCSS("/** simple visualization */ #snow{ marker-fill-opacity: 0.9; marker-line-color: #FFF; marker-line-width: 1; marker-line-opacity: 1; marker-placement: point; marker-type: ellipse; marker-width: 10; marker-fill: #FF6600; marker-allow-overlap: true; }");
	// })

	it("'s tile size should always be a power of 2, equal or higher to 256", function(){
		expect(this.layer._getTileSize()).not.toBeLessThan(256);
		var log = Math.log2(this.layer._getTileSize())
		expect(log).toEqual(parseInt(log, 10));
	})
});