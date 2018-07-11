const fs = require('fs');
const intersect = require('@turf/intersect');
const turf = require('@turf/turf');
const gjfilter = require('geojson-filter');
const topojson = require('topojson');
const clip = require('geojson-clip-polygon');
const _ = require('lodash');
var async = require("async");
const h3 = require('h3-js');
var NDDB = require('NDDB').NDDB;
var db = new NDDB();
db.loadSync('h3db.json');
db.index('id');
db.rebuildIndexes();

const restify = require('restify');
const server = restify.createServer();

server.use(restify.plugins.bodyParser({}));

//const luftrom = JSON.parse(fs.readFileSync('luftrom.geojson', 'utf8'));

const luftrom_tpj = JSON.parse(fs.readFileSync('luftrom.topojson', 'utf8'));

const kommuner_tpj = JSON.parse(fs.readFileSync('kommuner_med_hav.topojson', 'utf8'));

const outline = turf.flatten(topojson.merge(kommuner_tpj,kommuner_tpj.objects.kommuner_med_hav.geometries));
const luftrom = topojson.feature(luftrom_tpj,luftrom_tpj.objects.luftrom);



var clipped = [];
var collection;
/*
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
		console.log(err);
		collection = turf.featureCollection(clipped);
	}
);
*/

const classC = gjfilter(luftrom, ["==", "class", "C"]);



function respond(req, res, next) {
  res.send('hello ' + req.params.name);
  next();
}



server.get('/luftrom',function(req, res, next){
  res.send(gjfilter(collection, ["==", "class", "G"]));
  next();
});

server.get('/luftrom_c',function(req, res, next){
  res.send(classC);
  next();
});

server.get('/luftrom_tpj',function(req, res, next){
  res.send(luftrom_tpj);
  next();
});

server.get('/luftrom_tpj2',function(req, res, next){
  res.send(luftrom_tpj2);
  next();
});


server.get('/outline',function(req, res, next){
  res.send(outline);
  next();
});

server.get('/outline_tpj',function(req, res, next){
  res.send(kommuner_tpj);
  next();
});

server.get('/h3ToGeoBoundary/:h3Address', function(req,res,next){
	var geo = h3.h3ToGeoBoundary(req.params.h3Address,true);
 	res.send(turf.polygon([geo]));
 	next();
});

server.get('/cell/:zoom/:id', function(req,res,next){
	var item = db.id.get(req.params.id);
	var geo = h3.h3SetToMultiPolygon(item[req.params.zoom],true);
	geo[0] = _.filter(geo[0],function(d){
		return d.length > 2;
	});
 	res.send(turf.multiPolygon(geo));	
 	next();
});

server.get('/geojson/:id', function(req,res,next){
	var item = db.id.get(req.params.id);
 	res.send(item.geojson);	
 	next();
});


server.post('/h3SetToMultiPolygon', function(req,res,next){
	var geo = h3.h3SetToMultiPolygon(req.body,true);

	geo[0] = _.filter(geo[0],function(d){
		return d.length > 2;
	});
 	res.send(turf.multiPolygon(geo));
 	next();
});

server.get('/hello/:name', respond);

server.get('/', restify.plugins.serveStatic({
  directory: './public',
  file: 'index.html'
}));



server.listen(8080, function() {
  console.log('%s listening at %s', server.name, server.url);
});