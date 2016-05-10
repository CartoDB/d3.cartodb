describe('The XYZ provider', function () {
  beforeAll(function () {
    var d = document.createElement('div')
    d.setAttribute('id', 'map')
    document.body.appendChild(d)
    var c = [40.71512685201709, -74.00201797485352]
    this.map = new L.Map('map', {center: c, zoom: 3})
    this.layer = new L.CartoDBd3Layer({
      user: 'fdansv',
      table: 'snow',
      cartocss: '/** simple visualization */ #snow{ marker-fill-opacity: 0.9; marker-line-color: #FFF; marker-line-width: 1; marker-line-opacity: 1; marker-placement: point; marker-type: ellipse; marker-width: 10; marker-fill: #FF6600; marker-allow-overlap: true; }'
    })
    this.layer.addTo(this.map)
  })

  afterAll(function () {
    document.body.removeChild(document.getElementById('map'))
  })

  it('should load the layer properly with an asynchronous call', function(done) {
    var asyncLayer = new L.CartoDBd3Layer()
    var spy = jasmine.createSpy('geom')
    asyncLayer.provider.getGeometry = spy;
    asyncLayer.addTo(this.map)
    asyncLayer.provider.setURL('doesnt.really.matter')
    setTimeout(function () {
      expect(spy).toHaveBeenCalled()
      done()
    }, 0)
  })
})
