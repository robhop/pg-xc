
var Redis = require('ioredis');
const fs = require('fs');
const h3 = require('h3-js');
const turf = require('@turf/turf');
const async = require("async");
const _ = require('lodash');
var slug = require('slug')
const topojson = require('topojson');

const argv = require('minimist')(process.argv.slice(2));


var blacklist = ['orland-tma-5','balder-cta','heidrun-cta', 'es-r09', 'en-d209-risavika', 'es-r63d'];


if(!argv._.length) 
  process.exit();


var redis = new Redis(7777);

var prefix = argv.p ? argv.p + '-' : '';
blacklist = _.map(blacklist, (b) => {return prefix + b;});

var geojson;
if(argv.t) {
  var topojsonData = JSON.parse(fs.readFileSync(argv._[0], 'utf8')); 
  geojson = topojson.feature(topojsonData,topojsonData.objects[argv.t]);
 
} else {
  geojson = JSON.parse(fs.readFileSync(argv._[0], 'utf8'));
}

 
var allHexagons = [];

async.eachOfSeries(
  geojson.features,
  function(feature,key,callback){

    var properties = getProperties(feature.properties);


    if(blacklist.includes(properties.id)) {
      return callback();
    } 

    if(argv.f && feature.geometry.type == 'Polygon') {
      feature = turf.concave( turf.explode(feature));
    }

    else if(feature.geometry.type == 'MultiPolygon') {
      //clean_feature = feature;
    }

   // var h3Hexagons = toHexagons(feature,Number(argv.z));

    console.log(properties.id);

    var promises = [];
    if(!argv.d) {
      var pipeline1 = redis.pipeline();
      var promise1 = pipeline1
        .sadd('properties:id', properties.id )
        .sadd('properties:name', properties.name )
        .sadd('properties:class', properties.class )
        .sadd('group:' + properties.class, properties.id)
        .sadd('group:meters:from' + properties.from_m, properties.id)
        .sadd('group:meters:to' + properties.to_m, properties.id)
        .set('set:' + properties.id + ':geojson',JSON.stringify(feature))
        .hmset('set:' + properties.id + ':properties',properties).exec();

        promises.push(promise1);



 /*
      if(_.has(properties,'from_m') && _.has(properties,'to_m')){       
        for (var i = properties.from_m; i <= Math.min(properties.to_m,2000); i++ ) {
          redis.sadd('group:meters:at:' + i, properties.id);
        }
      }
*/

      if(argv.g){
          var pipeline2 = redis.pipeline();
          var promise2 = pipeline2
                .sadd('group:' + argv.g, properties.id).exec();

          promises.push(promise2);
      }        
    }

    Promise.all(promises).then(function(values) {
      //console.log(values);
      callback();
    });
      

  },
  function(err){
    if(err) {
      console.log("Error " + err);
    }

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


function getProperties(p) {

  o = {};

  if(_.has(p,'class')) o.class = p.class;
  if(_.has(p,'from (m amsl)')) o.from_m = Number(p['from (m amsl)']);
  if(_.has(p,'to (m amsl)')) o.to_m = Number(p['to (m amsl)']);
  if(_.has(p,'name')) o.name = p.name;
  if(_.has(p,'navn')) o.name = p.navn;
  if(_.has(p,'fylkenr')) o.fylkenr = p.fylkenr;
  o.id = _.has(p,'id') ? p.id : slug(prefix + o.name,{lower:true});

  return o;
}

function getPropertiesArray(p) {

  o = [];
  if(_.has(p,'class')) o.push('class:' + p.class);

  return o;
}