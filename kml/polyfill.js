var Redis = require('ioredis');
const turf = require('@turf/turf');
const _ = require('lodash');
const h3 = require('h3-js');
const async = require("async");

const { spawn } = require('child_process');
const argv = require('minimist')(process.argv.slice(2));

if(!argv._.length) 
 	process.exit();

if(!argv.f) 
 	process.exit();

if(!argv.t) 
 	process.exit();

var redis = new Redis(7777);


var q = async.queue(function(task, callback) {
	console.dir(task);
    //polyfillSet(task.id, task.zoom, callback);


	const child = spawn('node', ['child_polyfill.js', task.id, '-z', task.zoom]);

	child.on('exit', function (code, signal) {
		if(code) console.log('child process exited with ' + `code ${code} and signal ${signal}`);
	  	callback();
	});

}, 4);

// assign a callback
q.drain = function() {
	redis.end();
    console.log('all items have been processed');
};

redis.smembers('properties:id').then(function (result) {
	_
		.chain(result)
		.filter((o) => { return o.match(argv._); })
		.each(o => {
			_.each(_.range(Number(argv.f), Number(argv.t) + 1), (zoom) => {
				q.push({id:o, zoom:zoom});
			});
		})
		.value();
});




function polyfillSet(id, zoom, callback) {
	redis.get('set:' + id + ':geojson').then(function (result) {

		if(!result) {
			console.log("ERROR");
			return callback("Error");
		}

		var geojson = JSON.parse(result);
		
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
			callback()
		});	
	});

}


