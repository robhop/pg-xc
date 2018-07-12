var Redis = require('ioredis');
const turf = require('@turf/turf');
const _ = require('lodash');
const h3 = require('h3-js');

const argv = require('minimist')(process.argv.slice(2));

if(!argv._.length) 
 	process.exit();

if(!argv.z) 
 	process.exit();

var redis = new Redis(7777);

redis.get('set:' + argv._ +':geojson').then(function (result) {

	if(!result) 
		return redis.end();

	var geojson = JSON.parse(result);
	
	var h3Hexagons = h3.polyfill(geojson.geometry.coordinates, argv.z, true); 

	var exploded = _
		.chain(h3Hexagons)
		.map(function(h) { return h3.kRing(h,1); })
		.flatten()
		.uniq()     
		.value();

	var boundary = _.difference(exploded,h3Hexagons);


	var id = 'set:' + argv._ + ':h3:zoom-' + argv.z;
	var boundary_id = 'set:' + argv._ + ':h3:boundary:zoom-' + argv.z;

	console.log(id);


	var pipeline = redis.pipeline();
	var promise = pipeline
		.del(id)
		.sadd(id, h3Hexagons)
		.del(boundary_id)
		.sadd(boundary_id, boundary)
		.exec();

	promise.then(function() {
		redis.end();
	});
		
});


