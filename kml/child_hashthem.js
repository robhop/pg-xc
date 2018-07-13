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

		const inside = new Set();
		const outside = new Set();
		const ringed = new Set();

		var points =  _
			.chain(geojson.geometry.coordinates)
			.flatten()
			.map(function(c){
				return h3.geoToH3(c[1], c[0], zoom);  
		  })
		  .uniq()
		  .value();

		var old_count = 0;
		setInsideOutside(points,geojson,inside,outside);

		for (var i = 1000 - 1; i >= 0; i--) {
			old_count = inside.size;

			var ring = _
				.chain(Array.from(inside))
				.filter((r) => { return !ringed.has(r);})
				.map((p) => { return h3.kRing(p,1)})
				.flatten()
				.uniq()
				.value();

			_.each(ring,(i) => ringed.add);

			var filtered = _.filter(ring,(d) => {return !outside.has(d) || !inside.has(d)});

			//console.log("IN l " + inside.size);
			//console.log("RN l " + ring.length);
			setInsideOutside(filtered,geojson,inside,outside);
			if(inside.size == old_count)
				break;

			//console.log("RN " +JSON.stringify(ring));
			console.log("RN l " + ring.length);
			//console.log("FL" + JSON.stringify(filtered));
			console.log("FL l " + filtered.length);

		};
		

		fs.writeFileSync(zoom + '_dataout.json',JSON.stringify(Array.from(inside)), "utf8");
		console.log("IN l " + inside.size);
		//console.log("OU "+JSON.stringify(Array.from(outside)));
		//console.log("OU l " + outside.size);
		callback();
		
	},
	function(err){
		if(err) {
		  console.log("Error " + err);
		}
		console.log("Exit");
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

