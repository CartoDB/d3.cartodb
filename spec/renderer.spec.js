describe("The renderer", function() {
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
	  })
		spyOn(this.layer, "loadTile");
	  this.layer.addTo(this.map);
	});

	afterAll(function(){
		document.body.removeChild(document.getElementById('map'));
	});

	it("should have its dependencies loaded", function() {
		expect(d3).not.toEqual(undefined);
		expect(L).not.toEqual(undefined);
		expect(_).not.toEqual(undefined);
		expect(carto).not.toEqual(undefined);
	});

	it("setCartoCSS should update the css renderer", function(done) {
		var shader = this.layer.renderers[0].shader;
		this.layer.setCartoCSS(0, "/** simple visualization */ #snow{ marker-fill-opacity: 0.7; marker-line-color: #000; marker-line-width: 1; marker-line-opacity: 1; marker-placement: point; marker-type: ellipse; marker-width: 10; marker-fill: #FF6600; marker-allow-overlap: true; }")
		var self = this;
		_.defer(function(){
			expect(self.layer.renderers[0].shader).not.toEqual(shader);
			done();
		});
	});

	it("svg tiles should be correctly formed", function(){
		var features = MOCK_TILE;
		var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		debugger;
		this.layer.renderers[0].render(svg, features, {x: 2, y: 2, zoom: 3});
		expect(svg.children[0].children.length).toEqual(15);
	});

});