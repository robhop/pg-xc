const level = require('level');
var NDDB = require('NDDB').NDDB;
const fs = require('fs');
const h3 = require('h3-js');
const turf = require('@turf/turf');
const async = require("async");
const _ = require('lodash');


const argv = require('minimist')(process.argv.slice(2));

var db = new NDDB();
db.loadSync('h3db.json');
db.index('id');
db.rebuildIndexes();

if(!argv._.length) 
  process.exit();


if(!argv.z) 
  process.exit();

const geojson = JSON.parse(fs.readFileSync(argv._[0], 'utf8'));

var allHexagons = [];

async.eachOfSeries(
  geojson.features,
  function(feature,key,callback){

    if(feature.geometry.type != 'Polygon') {
      console.log("No Polygon");
      return callback();
    }


    var new_feature = turf.concave( turf.explode(feature));

    var h3Hexagons = toHexagons(feature,Number(argv.z));

    var features = cleanProperties(feature.properties);
    var data_object = db.id.get(features.id);
    if(!data_object) data_object = features;
    data_object[argv.z] = h3Hexagons;
    data_object.geojson = new_feature;

    db.insert(data_object);

  
    callback();

  },
  function(err){
    if(err) {
      console.log("Error " + err);
    }

    var r = db.select('class', '=', 'C').
                and('from_m', '=', 457).fetch(); // 2 items
    console.dir(r);

db.rebuildIndexes();
    var h = db.id.get('LJUNGBYHED TMA 2');

    console.dir(h);

    db.saveSync('h3db.json');
  }
);


function toHexagons(feature, zoom) {

  if(feature.type =! 'Polygon') return [];
  var within = h3.polyfill(feature.geometry.coordinates[0],zoom, true);

  var on = _.map(feature.geometry.coordinates[0], function(c){    
     return h3.geoToH3(c[1], c[0], zoom);     
  })
 
  return _.uniq(_.concat(on,within));
}


function cleanProperties(p) {

  o = {
    class: p.class,
    from_m:  Number(p['from (m amsl)']),
    to_m: Number(p['to (m amsl)']),
    name: p.name,
    id: p.name
  };
  return o;
}

function getPropertiesArray(p) {

  o = [];
  if(_.has(p,'class')) o.push('class:' + p.class);

  return o;
}