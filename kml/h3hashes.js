const fs = require('fs');
const h3 = require('h3-js');
const turf = require('@turf/turf');
const async = require("async");
const _ = require('lodash');


const argv = require('minimist')(process.argv.slice(2));

//console.dir(argv);

if(!argv._.length) 
	process.exit();

if(!argv.o) 
	process.exit();

if(!argv.z) 
	process.exit();


const geojson = JSON.parse(fs.readFileSync(argv._[0], 'utf8'));



var allHexagons = [];


async.eachOfSeries(
	geojson.features,
	function(feature,key,callback){

		var h3Hexagons = toHexagons(feature,Number(argv.z));

		allHexagons = _.union(allHexagons, h3Hexagons);


	
		callback();



	},
	function(err){
		if(err) {
			console.log("Error " + err);
			process.exit();
		}
			fs.writeFileSync(argv.o,JSON.stringify(allHexagons), "utf8");
	}
);

/*
function toHexagons(feature, zoom) {

	if(feature.type =! 'Polygon') return [];
	var hexagons = h3.polyfill(feature.geometry.coordinates[0],zoom, true);
	return hexagons;
}
*/

function toHexagons(feature, zoom) {

  if(feature.type =! 'Polygon') return [];
  var within = h3.polyfill(feature.geometry.coordinates[0],zoom, true);

  var on = _.map(feature.geometry.coordinates[0], function(c){    
     return h3.geoToH3(c[1], c[0], zoom);     
  })
 
  return _.uniq(_.concat(on,within));
}