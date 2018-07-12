var Redis = require('ioredis');
const turf = require('@turf/turf');
const _ = require('lodash');
const h3 = require('h3-js');
const async = require("async");

const argv = require('minimist')(process.argv.slice(2));


var redis = new Redis(7777);

if(!argv._.length) 
 	process.exit();

if(!argv.f) 
 	process.exit();

if(!argv.t) 
 	process.exit(); 

var id = argv._;


redis.get('set:' + id + ':geojson').then(function (result) {

	if(!result) {
		console.log("ERROR");
		return callback("Error");
	}

	var geojson = JSON.parse(result);


	async.eachOfSeries(
		_.range(Number(argv.f), Number(argv.t) + 1),
		(zoom,key,callback) => {

			var h3Hexagons = h3.polyfill(geojson.geometry.coordinates, zoom, true); 

			if(!h3Hexagons) {
				console.log("No hexagons in " + 'set:' + id + ':geojson');
			}

			var exploded = _
				.chain(h3Hexagons)
				.map(function(h) { return h3.kRing(h,1); })
				.flatten()
				.uniq()     
				.value();

			var boundary = _.difference(exploded,h3Hexagons);

			var points =  _
				.chain(geojson.geometry.coordinates)
				.flatten()
				.map(function(c){
					return h3.geoToH3(c[1], c[0], zoom);  
			  	})
			  	.uniq()
			  	.value();

			var set_id = 'set:' + id + ':h3:interior:zoom-' + zoom;
			var boundary_id = 'set:' + id + ':h3:boundary:zoom-' + zoom;
			var points_id = 'set:' + id + ':h3:points:zoom-' + zoom;

			var pipeline = redis.pipeline();
			pipeline
				.del(set_id)
				.sadd(set_id, h3Hexagons)
				.del(boundary_id)
				.sadd(boundary_id, boundary)
				.del(points_id)
				.sadd(points_id, points)		


			var promises = [];

			if(argv.i && (zoom == Number(argv.i))) {
				var pipeline2 = redis.pipeline();
				var all = _
					.chain(exploded)
					.union(points)
					.uniq()
					.value();

				_.each(all, (h) => {
					var mask_id = 'mask:' + zoom + ':' + h;
					pipeline2
					.sadd(mask_id, id)
				});
				
				promises.push(pipeline2.exec());
				
			}

			promises.push(pipeline.exec());

			Promise.all(promises).then(function() {
				callback();
			});	
		
	},
	function(err){
		if(err) {
		  console.log("Error " + err);
		}

		redis.quit();
	});

	/*
	var h3Hexagons = h3.polyfill(geojson.geometry.coordinates, zoom, true); 

	if(!h3Hexagons) {
		console.log("No hexagons in " + 'set:' + id + ':geojson');
	}

	var exploded = _
		.chain(h3Hexagons)
		.map(function(h) { return h3.kRing(h,1); })
		.flatten()
		.uniq()     
		.value();

	var boundary = _.difference(exploded,h3Hexagons);

	var points =  _
		.chain(geojson.geometry.coordinates)
		.flatten()
		.map(function(c){
			return h3.geoToH3(c[1], c[0], zoom);  
      	})
      	.uniq()
      	.value();

	var set_id = 'set:' + id + ':h3:interior:zoom-' + zoom;
	var boundary_id = 'set:' + id + ':h3:boundary:zoom-' + zoom;
	var points_id = 'set:' + id + ':h3:points:zoom-' + zoom;

	var pipeline = redis.pipeline();
	pipeline
		.del(set_id)
		.sadd(set_id, h3Hexagons)
		.del(boundary_id)
		.sadd(boundary_id, boundary)
		.del(points_id)
		.sadd(points_id, points)		
	

	var promises = [];

	if(argv.i && (zoom == Number(argv.i))) {
		var pipeline2 = redis.pipeline();
		var all = _
			.chain(exploded)
			.union(points)
			.uniq()
			.value();

		_.each(all, (h) => {
			var mask_id = 'mask:' + zoom + ':' + h;
			pipeline2
			.sadd(mask_id, id)
		});
		
		promises.push(pipeline2.exec());
		
	}

    promises.push(pipeline.exec());

	Promise.all(promises).then(function() {
		redis.end();
	});	
	*/
});

