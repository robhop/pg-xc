const level = require('level');
var NDDB = require('NDDB').NDDB;
var Redis = require('ioredis');
const fs = require('fs');
const h3 = require('h3-js');
const turf = require('@turf/turf');
const async = require("async");
const _ = require('lodash');
var slug = require('slug')


const argv = require('minimist')(process.argv.slice(2));


if(!argv._.length) 
  process.exit();

if(!argv.z) 
  process.exit();


var db = new NDDB();
db.loadSync('h3db.json');
db.index('id');
db.rebuildIndexes();



var redis = new Redis(7777);



const geojson = JSON.parse(fs.readFileSync(argv._[0], 'utf8'));

var allHexagons = [];

async.eachOfSeries(
  geojson.features,
  function(feature,key,callback){

    if(feature.geometry.type == 'Polygon') {

      var new_feature = turf.concave( turf.explode(feature));
      var h3Hexagons = toHexagons(feature,Number(argv.z));
  
      var features = cleanProperties(feature.properties);
      var data_object = db.id.get(features.id);
      if(!data_object) data_object = features;
      data_object[argv.z] = h3Hexagons;
      data_object.geojson = new_feature;

      if(!argv.d)
        db.insert(data_object);
      else {
        console.log(JSON.stringify(data_object.id))
      }
    }

    else if(feature.geometry.type == 'MultiPolygon') {
      var h3Hexagons = toHexagons(feature,Number(argv.z));
      var data_object = cleanProperties(feature.properties);

      var stored = db.id.get(data_object.id);
      if(stored) 
        data_object = Object.assign(stored,data_object);

      data_object[argv.z] = h3Hexagons;
      data_object.geojson = feature;

      if(!argv.d)
        db.insert(data_object);
      else {
        console.log(JSON.stringify(data_object.id))
        redis.sadd(data_object.id + ':h3:zoom' + argv.z,h3Hexagons);
        redis.set(data_object.id + ':geojson',JSON.stringify(feature));
      }
    }

    
  
    callback();

  },
  function(err){
    if(err) {
      console.log("Error " + err);

    }
/*
    var r = db.select('class', '=', 'C').
                and('from_m', '=', 457).fetch(); // 2 items
    console.dir(r);

db.rebuildIndexes();
    var h = db.id.get('LJUNGBYHED TMA 2');

    console.dir(h);
  */

    if(!argv.d)
      db.saveSync('h3db.json');

    redis.quit();
  }
);


function toHexagons(feature, zoom) {

  return _
    .chain(feature.geometry.coordinates)
    .map(function(c){
      var within = h3.polyfill(c,zoom, true); 
      var on = _.map(c, function(c){    
        return h3.geoToH3(c[1], c[0], zoom);     
      });
      return _.concat(on,within);
    })
    .flatten()
    .compact()
    .uniq()
    .value();;


}


function cleanProperties(p) {

  o = {};

  if(_.has(p,'class')) o.class = p.class;
  if(_.has(p,'from (m amsl')) o.from_m = Number(p['from (m amsl)']);
  if(_.has(p,'to (m amsl)')) o.to_m = Number(p['to (m amsl)']);
  if(_.has(p,'name')) o.name = p.name;
  if(_.has(p,'navn')) o.name = p.navn;
  if(_.has(p,'fylkenr')) o.fylkenr = p.fylkenr;
  o.id = slug(o.name);

  return o;
}

function getPropertiesArray(p) {

  o = [];
  if(_.has(p,'class')) o.push('class:' + p.class);

  return o;
}