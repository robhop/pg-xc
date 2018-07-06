const fs = require('fs');
const turf = require('@turf/turf');
const async = require("async");
const intersect = require('@turf/intersect');


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

//console.dir(luftrom);

var clipped = [];	
async.eachOfSeries(
	luftrom.features,
	function(feature,key,callback){

		var new_feature = turf.concave( turf.explode(feature));

		new_feature = intersect.default(new_feature,outline.features[0]);

		if(new_feature){
			new_feature.properties = feature.properties;
			clipped.push(new_feature);	
		} 
		callback();

	},
	function(err){
		
		var collection = turf.featureCollection(clipped);
		fs.writeFileSync(argv.o,JSON.stringify(collection), "utf8");
	}
);
