describe("The provider", function() {
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
    this.renderer = this.layer.renderer;
  });

  afterAll(function(){
    document.body.removeChild(document.getElementById('map'));
  });

  it("query shouldn't be performed if the tile is in cache", function(done) {

    var self = this;
    this.map.zoomIn();
    _.defer(function(){
      self.map.zoomOut();
      spyOn(self.layer.provider, "_query");
      _.defer(function(){
        expect(self.layer.provider._query).not.toHaveBeenCalled();
        done();
      })
    })
  });

  it("tile bounds should be calculated correctly", function() {
    spyOn(this.layer.provider, "getGeometry");
    this.layer.provider.getTile({x: 2, y: 3, zoom: 3});
    expect(this.layer.provider.getGeometry).toHaveBeenCalled();
    expect(this.layer.provider.getGeometry.calls.first().args[0]).toEqual("SELECT * FROM snow WHERE the_geom && ST_MakeEnvelope(-45,0,-90,40.97989806962014, 4326)");
  });

  it("sql query should contain ST_MakeEnvelope", function(){
    spyOn(d3,"json");
    this.layer.provider.getTile({x: 2, y: 3, zoom: 3});
    expect(d3.json.calls.first().args[0].indexOf("ST_MakeEnvelope")).not.toEqual(-1);
  });

  it("should return correct pixel size for zoom", function(){
    expect(this.layer.provider.pixelSizeForZoom(3)).toEqual(19567.87939453125);
    expect(this.layer.provider.pixelSizeForZoom(10)).toEqual(152.8740577697754);
    expect(this.layer.provider.pixelSizeForZoom(14)).toEqual(9.554628610610962);
  });
});