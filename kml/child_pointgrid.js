var Redis = require('ioredis');
const turf = require('@turf/turf');
const _ = require('lodash');
const h3 = require('h3-js');
const async = require("async");
const fs = require('fs');

const argv = require('minimist')(process.argv.slice(2));


var redis = new Redis(6379);

if(!argv._.length) 
 	process.exit();

if(!argv.z) 
 	process.exit(); 

var id = argv._;
var zoom = argv.z;



redis.get('set:' + id + ':geojson').then(function (result) {


	if(!result) {
		console.log("ERROR");
		return callback("Error");
	}


	var geojson = JSON.parse(result);

	//var kmh3 = h3.edgeLength('km',5);
	//console.log("km3 " + kmh3);

	console.log("ho");

	var km = h3.edgeLength(zoom,'km');
	
	var grid = turf.pointGrid(turf.bbox(geojson),km,{mask:geojson});

	var points = _
		.chain(grid.features)
		.map((f) => {
			var c = f.geometry.coordinates;
			return h3.geoToH3(c[1], c[0], zoom);
		})
		.value();

	//fs.writeFileSync(zoom + '_dataout.json',JSON.stringify(points), "utf8");


	//console.dir(points);
	const sets = {};

		const inside = new Set();
		const outside = new Set();

		//var points = turf.pointGrid(geojson,1);

		//console.dir(points);

		setInsideOutside(points, geojson,inside,outside);

		//if(inside.size == 0) return callback();

		//sets[zoom] = Array.from(inside);

	//	fs.writeFileSync(zoom + '_dataout.json',JSON.stringify(Array.from(inside)), "utf8");
 
	//console.dir(inside);
	var set_id = 'set:' + id + ':h3:zoom-' + zoom;

		var pipeline = redis.pipeline();
		pipeline
			.del(set_id)
			.sadd(set_id, Array.from(inside));

		var promise = pipeline.exec();
		promise.then(function() {
			redis.quit();
		});		


		

});


function setInsideOutside(points,geojson,inside,outside){
		for (var i = points.length - 1; i >= 0; i--) {
			var r = h3.h3ToGeo(points[i],true);
			var p = turf.point(_.reverse(r));
			if(turf.inside(p,geojson)){
				inside.add(points[i])
			} else {
				outside.add(points[i]);
			}
		};
}

