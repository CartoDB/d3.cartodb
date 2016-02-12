describe('The filter', function () {
  beforeAll(function () {
    this.filter = new cartodb.d3.filter()
    this.tile = MOCK_TILE
  })

  it('should add a tile correctly', function () {
    this.filter.addTile({x: 2, y: 1, zoom: 3}, this.tile)
    expect(this.filter.crossfilter.size()).toEqual(15)
  })

  it('should add the tile to the tileset', function () {
    expect(this.filter.tiles['3:2:1']).toBe(true)
  })

  it('should fetch a tile by tilePoint', function () {
    expect(this.filter.getTile({x: 2, y: 1, zoom: 3}).features.length).toEqual(15)
  })

  it('should remove a tile by tilePoint', function () {
    this.filter.removeTile({x: 2, y: 1, zoom: 3})
    expect(this.filter.crossfilter.size()).toEqual(0)
  })

  it('should remove the tile from the tileset', function () {
    expect(Object.keys(this.filter.tiles).length).toEqual(0)
  })

  it('should add a dimension when filtering for the first time', function () {
    this.filter.addTile({x: 2, y: 1, zoom: 3}, this.tile)
    this.filter.filterReject('name', ['Illinois'])
    expect(this.filter.dimensions.name).not.toBeUndefined()
    this.filter.dimensions.name.filterAll()
  })

  it("shouldn't add a second dimension for the same column", function () {
    this.filter.filterAccept('name', ['Arizona'])
    expect(Object.keys(this.filter.dimensions).length).toEqual(2)
    this.filter.dimensions.name.filterAll()
  })

  it('should only include results within ranged values', function () {
    this.filter.filterRange('diss_me', [3540, 3550])
    var ranCheck = false
    this.filter.getValues('diss_me').forEach(function (f) {
      expect(f.properties.diss_me >= 3540 && f.properties.diss_me <= 3550).toBe(true)
      ranCheck = true
    })
    expect(ranCheck).toBe(true)
    this.filter.dimensions.diss_me.filterAll()
  })

  it("should only include results that haven't been rejected", function () {
    this.filter.filterReject('name', ['Illinois'])
    var ranCheck = false
    this.filter.getValues('name').forEach(function (f) {
      expect(f.properties.name != 'Illinois').toBe(true)
      ranCheck = true
    })
    expect(ranCheck).toBe(true)
    this.filter.dimensions.name.filterAll()
  })

  it('should only include results that have been accepted', function () {
    this.filter.filterAccept('name', ['Illinois'])
    var ranCheck = false
    this.filter.getValues('name').forEach(function (f) {
      expect(f.properties.name === 'Illinois').toBe(true)
      ranCheck = true
    })
    expect(ranCheck).toBe(true)
    this.filter.dimensions.name.filterAll()
  })

  it('should return the original feature count when all filters are cleared', function () {
    this.filter.filterAccept('name', ['Illinois'])
    this.filter.clearFilters()
    expect(this.filter.crossfilter.size() === 15).toBe(true)
  })

  it ('shouldn\'t return more than one feature with the same cartodb_id', function () {
    var initialLength = this.filter.getValues().length
    this.filter.addTile({x: 2, y: 1, zoom: 3}, this.tile)
    expect(initialLength).toEqual(this.filter.getValues().length)
  })
})
