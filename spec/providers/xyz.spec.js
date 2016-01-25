fdescribe('The XYZ provider', function () {
  beforeAll(function () {
    this.provider = new cartodb.d3.provider.XYZProvider({
      layer: {}
    })
  })

  it('should set ready when url is set', function () {
    this.provider.setURL('http://wo.lo/lo')
    expect(this.provider.ready).toBe(true)
  })
})
