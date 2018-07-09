const fs = require('fs');
const h3 = require('h3-js');
const turf = require('@turf/turf');
const async = require("async");
const _ = require('lodash');



const argv = require('minimist')(process.argv.slice(2));

//console.dir(argv);

if(!argv._.length) 
	process.exit();

if(!argv.c) 
	process.exit();

if(!argv.o) 
	process.exit();



const luftrom = JSON.parse(fs.readFileSync(argv._[0], 'utf8'));

const outline = JSON.parse(fs.readFileSync(argv.c, 'utf8'));



async.eachOfSeries(
	outline.features,
	function(feature,key,callback){

/*
		var flat = turf.explode(feature);
		*/

		//var ponts = _.map(,_.reverse);

		var multiPoly = toHexagons(feature,5);

		fs.writeFileSync(argv.o,JSON.stringify(multiPoly), "utf8");
	
		callback();

		process.exit();

	},
	function(err){
		
	
	//	console.dir(ranges);
	});



function toHexagons(feature, zoom) {
	var hexagons = h3.polyfill(feature.geometry.coordinates[0],zoom, true);
	console.log(hexagons.length);
	var compacted = h3.compact(hexagons);
	//console.log(compacted.length);
	const coordinates = h3.h3SetToMultiPolygon(hexagons, true)
	coordinates[0] = _.filter(coordinates[0],function(d){
		return d.length > 3;
	});
	var multiPoly = turf.multiPolygon(coordinates);
	return multiPoly;
}