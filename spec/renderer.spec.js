describe("The renderer", function() {
	beforeAll(function(){
		var d = document.createElement("div");
		d.setAttribute("id", "map");
		document.body.appendChild(d);
		var c = [40.71512685201709, -74.00201797485352];
		var map = new L.Map("map", {center: c, zoom: 3});
		var cartoDBd3Layer = new L.CartoDBd3Layer({
	    user: 'fdansv',
	    table: 'snow',
	    cartocss: "/** simple visualization */ #snow{ marker-fill-opacity: 0.9; marker-line-color: #FFF; marker-line-width: 1; marker-line-opacity: 1; marker-placement: point; marker-type: ellipse; marker-width: 10; marker-fill: #FF6600; marker-allow-overlap: true; }"
	  }).addTo(map);
	}),
	it("should have its dependencies loaded", function() {
		expect(d3).not.toEqual(undefined);
		expect(L).not.toEqual(undefined);
		expect(_).not.toEqual(undefined);
		expect(carto).not.toEqual(undefined);
	})

})