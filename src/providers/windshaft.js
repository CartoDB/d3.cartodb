var d3 = require("d3");

function WindshaftProvider(options) {
	this.sql_api_template = options.sql_api_template || 'http://{user}.cartodb.com';
	this.user = options.user;
	this.table = options.table;
	this.format = options.format;
	this.tileCache = {};
}

WindshaftProvider.prototype = {

};