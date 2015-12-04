describe("The filter", function(){
	beforeAll(function(){
		var map = new L.Map("map", {center: c, zoom: 3})

	  L.tileLayer('http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
	  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="http://cartodb.com/attributions">CartoDB</a>'
	  }).addTo(map);

	  var cartoDBd3Layer = new L.CartoDBd3Layer({
	    user: 'fdansv',
	    table: 'ne_10m_populated_places_simple_6',
	    cartocss: document.getElementById('choropleth').innerHTML,
	    tiler_template: "http://development.localhost.lan:8181"
	  }).addTo(map);
 	});

 	afterAll(function(){
		document.body.removeChild(document.getElementById('map'));
	});

	afterEach(function(){
		this.map.removeLayer(this.layer);
	});

	it("", function(){

	})

});