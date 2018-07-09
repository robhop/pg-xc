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

if(!argv.d) 
	process.exit();


const luftrom = JSON.parse(fs.readFileSync(argv._[0], 'utf8'));

const outline = JSON.parse(fs.readFileSync(argv.c, 'utf8'));

var clipped = [];
var debugArray = [];
var sets = {};	
var classes = {};	
var ranges = {};	

async.eachOfSeries(
	luftrom.features,
	function(feature,key,callback){

		var new_feature = turf.concave( turf.explode(feature));

		new_feature = turf.intersect(new_feature,outline.features[0]);
		
		if(new_feature){
			if(feature.geometry.type != new_feature.geometry.type){
				debugArray.push(new_feature);
			} else {
				new_feature.properties = cleanProperties(feature.properties);
	//		console.dir(feature);
	//		console.dir(new_feature);			
	//		var new_feature2 = turf.simplify(new_feature,{tolerance: 0.01, highQuality: false});
				clipped.push(new_feature);	
			}

		} 
		callback();

	},
	function(err){
		
		var collection =  turf.featureCollection(clipped);
		fs.writeFileSync(argv.o,JSON.stringify(collection), "utf8");
		var debugArrayCollection =  turf.featureCollection(debugArray);
		fs.writeFileSync(argv.d,JSON.stringify(debugArrayCollection), "utf8");
	//	console.dir(ranges);
	}
);



function cleanProperties(p) {

	o = {
		class: p.class,
		from_m:  Number(p['from (m amsl)']),
		to_m: Number(p['to (m amsl)']),
		name: p.name
	};

	var set_key = o.class + '_' + o.from_m + '_' + o.to_m;
	if(set_key in sets) sets[set_key] +=1
	else sets[set_key] = 1;

	var class_key = o.class ;
	if(class_key in classes) classes[class_key] +=1
	else classes[class_key] = 1;

	var range_key =  o.from_m + '_' + o.to_m;
	if(range_key in ranges) ranges[range_key] +=1
	else ranges[range_key] = 1;

	//console.dir(o)

	return o;
}