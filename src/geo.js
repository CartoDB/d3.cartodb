module.exports = {
	tile2lon: function(x,z) {
		return (x/Math.pow(2,z)*360-180);
	},
	tile2lat: function(y,z) {
		var n=Math.PI-2*Math.PI*y/Math.pow(2,z);
		return (180/Math.PI*Math.atan(0.5*(Math.exp(n)-Math.exp(-n))));
	}
}