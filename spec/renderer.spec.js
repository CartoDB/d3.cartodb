describe('The renderer', function () {
  beforeAll(function () {
    this.renderer = new cartodb.d3.Renderer({index: 0, cartocss: '/** simple visualization */ #snow{ marker-fill-opacity: 0.9; marker-line-color: #FFF; marker-line-width: 1; marker-line-opacity: 1; marker-placement: point; marker-type: ellipse; marker-width: 10; marker-fill: #FF6600; marker-allow-overlap: true; }'})
  })

  afterAll(function () {
    document.body.removeChild(document.getElementById('map'))
  })

  it('should have its dependencies loaded', function () {
    expect(d3).not.toEqual(undefined)
    expect(L).not.toEqual(undefined)
    expect(_).not.toEqual(undefined)
    expect(carto).not.toEqual(undefined)
  })
  describe('when setting CartoCSS styles', function() {
    it('should update the css renderer', function () {
      this.renderer = new cartodb.d3.Renderer({index:0, cartocss: '/** simple visualization */ #snow{ marker-fill-opacity: 0.9; marker-line-color: #FFF; marker-line-width: 1; marker-line-opacity: 1; marker-placement: point; marker-type: ellipse; marker-width: 10; marker-fill: #FF6600; marker-allow-overlap: true; }'})
      var s = this.renderer.shader;
      this.renderer.setCartoCSS('/** simple visualization */ #snow{ marker-fill-opacity: 0.7; marker-line-color: #000; marker-line-width: 1; marker-line-opacity: 1; marker-placement: point; marker-type: ellipse; marker-width: 10; marker-fill: #FF6600; marker-allow-overlap: true; }')
      expect(this.renderer.shader).not.toEqual(s)
    })

    it('should uniformise its layer names', function () {
      var style = "/** simple visualization */ @ramp7: #000000;  #clientes {   [point=0]{       marker-width: 0;     }   [point=1]{       marker-fill-opacity: 1;     }     marker-line-color: #FFF;     marker-line-width: 0.1;     marker-line-opacity: 1;     marker-placement: point;     marker-type: ellipse;     marker-allow-overlap: true;     marker-width: 3;     [zoom<14]{     marker-width: 2;    }       line-color:@ramp7;     line-width: 0.4;     [zoom>14]{     line-width: 0;     }     line-opacity: .1;     marker-fill: @ramp7;     line-color: @ramp7;     }  #clientes_2[edad_clien>=0]{ marker-width: 4; } "
      var renderer = new cartodb.d3.Renderer({index:0, cartocss: style})
      expect(renderer.shader.getLayers()[0].shader['marker-width'].js.length).toEqual(4)
    })
  })

  it('svg tiles should be correctly formed', function () {
    var features = MOCK_TILE
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    this.renderer.render(svg, features, {x: 2, y: 2, zoom: 3})
    expect(svg.children[0].children[0].children.length).toEqual(15)
  })


  describe('when drawing points', function () {
    it('should render their widths correctly', function () {
      var renderer = new cartodb.d3.Renderer({index: 0, cartocss: '#snow{ marker-fill-opacity: 0.9; marker-line-color: #FFF; marker-line-width: 1; marker-line-opacity: 1;  marker-width: [population]; marker-fill: #FF6600; }'})
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      var features = MOCK_TILE_WIDTHS
      renderer.render(svg, features, {x: 2, y: 1, zoom: 2})
      var circles = svg.children[0].children[0].children
      expect(circles[0].attributes.r.value).toEqual("15")
      expect(circles[1].attributes.r.value).toEqual("7.5")
      expect(circles[2].attributes.r.value).toEqual("2.5")
    })

    it('should render text when text properties are indicated', function () {
      var renderer = new cartodb.d3.Renderer({index: 0, cartocss: '#snow{ marker-fill-opacity: 0.9; marker-line-color: #FFF; marker-line-width: 1; marker-line-opacity: 1;  marker-width: [population]; marker-fill: #FF6600; } #sensor_log_2015_09_20_12_53::labels { text-name: [population]; text-size: 10; text-label-position-tolerance: 10; text-fill: #000; text-halo-fill: #FFF; text-halo-radius: 1; text-dy: -10; text-allow-overlap: true; text-placement: point; text-placement-type: simple; }'})
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      var features = MOCK_TILE_WIDTHS
      renderer.render(svg, features, {x: 2, y: 1, zoom: 2})
      var elements = svg.children[0].children[1].children
      expect(elements[0].attributes["class"].value).toEqual('text')
    })

    xit('should apply turbo style properties correctly', function (done) {
      var renderer = new cartodb.d3.Renderer({index: 0, cartocss: '#snow{ marker-fill-opacity: 0.9; marker-line-color: #FFF; marker-line-width: 1; marker-line-opacity: 1;  marker-width: ramp(population); marker-fill: #FF6600; } '})
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      var features = MOCK_TILE_WIDTHS
      var tilePoint = {x: 2, y: 1, zoom: 2}
      renderer.filter.addTile(tilePoint, features)
      renderer.filter.trigger('featuresChanged')
      // We need to defer because turbo cartocss is async
      setTimeout(function () {
        renderer.render(svg, features, tilePoint)
        var elements = svg.children[0].children[0].children
        expect(elements.length > 0).toBe(true)
        done()
      }, 0)
    })

    xit('should apply jenks turbo style properties correctly', function (done) {
      var renderer = new cartodb.d3.Renderer({index: 0, cartocss: '#snow{ marker-fill-opacity: 0.9; marker-line-color: #FFF; marker-line-width: 1; marker-line-opacity: 1;  marker-width: 6; marker-fill: ramp([population], cartocolor(Sunset2, 3), jenks); } '})
      var svg = document.createElementNS('http://www.w3.org/00/svg', 'svg')
      var features = MOCK_TILE_WIDTHS
      var tilePoint = {x: 2, y: 1, zoom: 2}
      renderer.filter.addTile(tilePoint, features)
      renderer.filter.trigger('featuresChanged')
      // We need to defer because turbo cartocss is async
      setTimeout(function () {
        renderer.render(svg, features, tilePoint)
        var elements = svg.children[0].children[0].children
        expect(elements.length > 0).toBe(true)
        expect(elements[0].style.fill).toEqual('rgb(243, 231, 155)')
        done()
      }, 0)
    })

    xit('should apply headstails turbo style properties correctly', function (done) {
      var renderer = new cartodb.d3.Renderer({index: 0, cartocss: '#snow{ marker-fill-opacity: 0.9; marker-line-color: #FFF; marker-line-width: 1; marker-line-opacity: 1;  marker-width: 6; marker-fill: ramp([population], cartocolor(Sunset2, 3), headstails); } '})
      var svg = document.createElementNS('http://www.w3.org/00/svg', 'svg')
      var features = MOCK_TILE_WIDTHS
      var tilePoint = {x: 2, y: 1, zoom: 2}
      renderer.filter.addTile(tilePoint, features)
      renderer.filter.trigger('featuresChanged')
      // We need to defer because turbo cartocss is async
      setTimeout(function () {
        renderer.render(svg, features, tilePoint)
        var elements = svg.children[0].children[0].children
        expect(elements.length > 0).toBe(true)
        expect(elements[0].style.fill).toEqual('rgb(92, 83, 165)')
        done()
      }, 0)
    })
  })

  describe('when drawing multiple geometry types on the same layer', function () {
    it ('should draw a path and a circle in the same svg', function () {
      var features = MOCK_DIFFERENT_TYPES
      var renderer = new cartodb.d3.Renderer({ index: 0, cartocss: '#snow{ marker-fill-opacity: 0.9; line-color: #000; marker-line-color: #FFF; marker-line-width: 1; marker-line-opacity: 1;  marker-width: 8; marker-fill: #FF6600; }'})
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      renderer.render(svg, features, {x: 2, y: 1, zoom: 2})
      var elements = svg.children[0].children[0].children
      expect(elements[1].style.stroke).toEqual('rgb(0, 0, 0)')
      expect(elements[0].tagName).toEqual('circle')
      expect(elements[1].tagName).toEqual('path')
    })
  })
})
