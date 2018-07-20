const fs = require('fs');
const turf = require('@turf/turf');
const async = require("async");
const _ = require('lodash');
const slug = require('slug')
const topojson = require('topojson');
const mongojs = require('mongojs');
const argv = require('minimist')(process.argv.slice(2));



if(!argv._.length) 
  process.exit();

const prefix = argv.p ? argv.p + '-' : '';
const blacklist = _.map(['orland-tma-5','balder-cta','heidrun-cta', 'es-r09', 'en-d209-risavika', 'es-r63d'], (b) => {return prefix + b;});


var db = mongojs('nl3');
var featuresCollection = db.collection('features')

var geojson;
if(argv.t) {
  var topojsonData = JSON.parse(fs.readFileSync(argv._[0], 'utf8')); 
  geojson = topojson.feature(topojsonData,topojsonData.objects[argv.t]);
 
} else {
  geojson = JSON.parse(fs.readFileSync(argv._[0], 'utf8'));
}


var bulk = featuresCollection.initializeOrderedBulkOp();
 
_.each(
  geojson.features,
  function(feature){

    var properties = getProperties(feature.properties);


    if(blacklist.includes(properties.id)) {
      return ;
    } 

    if(argv.f && feature.geometry.type == 'Polygon') {
      feature = turf.concave( turf.explode(feature));
    }

    else if(feature.geometry.type == 'MultiPolygon') {
      //clean_feature = feature;
    }

    console.log(properties.id);
    
    bulk.insert({
      _id: properties.id,
      properties:properties,
      feature: feature
    });
    
       
  }
);

bulk.execute(function (err, res) {
  console.log('Done!')
  db.close();
})
console.log("End");



function getProperties(p) {

  o = {};
 
  if(_.has(p,'class')) o.class = p.class;
  if(_.has(p,'from (m amsl)')) o.from_m = Number(p['from (m amsl)']);
  if(_.has(p,'to (m amsl)')) o.to_m = Number(p['to (m amsl)']);
  if(_.has(p,'name')) o.name = p.name;
  if(_.has(p,'navn')){
    o.name = Array.isArray(p.navn) ? p.navn[0] : p.navn ;
  } 
  if(_.has(p,'fylkenr')) o.fylkenr = p.fylkenr;
  o.id = _.has(p,'id') ? p.id : slug(prefix + o.name,{lower:true});

  return o;
}

function getPropertiesArray(p) {

  o = [];
  if(_.has(p,'class')) o.push('class:' + p.class);

  return o;
}