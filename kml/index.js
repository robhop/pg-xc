const fs = require('fs');
const intersect = require('@turf/intersect');
const turf = require('@turf/turf');
const gjfilter = require('geojson-filter');
const topojson = require('topojson');
const clip = require('geojson-clip-polygon');
const _ = require('lodash');
var async = require("async");
const h3 = require('h3-js');
var Redis = require('ioredis');

var redis = new Redis(7777);

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
	redis.smembers('set:'+ req.params.id + ':h3:zoom-' + req.params.zoom, function (err, result) {

	  	if(err) return next(err);

	  	var geo = h3.h3SetToMultiPolygon(result,true);
		geo[0] = _.filter(geo[0],function(d){
			return d.length > 2;
		});
	 	res.send(turf.multiPolygon(geo));	
	 	next();
	});
});


server.get('/cellboundary/:zoom/:id', function(req,res,next){
	redis.smembers('set:'+ req.params.id + ':h3:boundary:zoom-' + req.params.zoom, function (err, result) {

	  	if(err) return next(err);

	  	var geo = h3.h3SetToMultiPolygon(result,true);
		geo[0] = _.filter(geo[0],function(d){
			return d.length > 2;
		});
	 	res.send(turf.multiPolygon(geo));	
	 	next();
	});
});


server.get('/points/:zoom/:id', function(req,res,next){

	var id = 'set:'+ req.params.id + ':h3:points:zoom-' + req.params.zoom;
	redis.smembers(id, function (err, result) {

	  	if(err) return next(err);

	  	var geo = h3.h3SetToMultiPolygon(result,true);
		geo[0] = _.filter(geo[0],function(d){
			return d.length > 2;
		});
	 	res.send(turf.multiPolygon(geo));	
	 	next();
	});
});

server.get('/bigcell/:zoom/:id', function(req,res,next){

	var id = 'set:'+ req.params.id + ':h3:interior:zoom-' + req.params.zoom;
	var boundary_id = 'set:'+ req.params.id + ':h3:boundary:zoom-' + req.params.zoom;	
	var points_id = 'set:'+ req.params.id + ':h3:points:zoom-' + req.params.zoom;

	redis.sunion(id, boundary_id, points_id, function (err, result) {

	  	if(err) return next(err);

	  	var geo = h3.h3SetToMultiPolygon(result,true);
		geo[0] = _.filter(geo[0],function(d){
			return d.length > 2;
		});
	 	res.send(turf.multiPolygon(geo));	
	 	next();
	});
});


server.get('/group/:zoom/:id', function(req,res,next){

	var features = [];

  	var q = async.queue(function(id, callback) {
		redis.smembers('set:'+ id + ':h3:interior:zoom-' + req.params.zoom, function (err, result) {
		  	if(err) return next(err);

		  	var geo = h3.h3SetToMultiPolygon(result,true);
			geo[0] = _.filter(geo[0],function(d){
				return d.length > 2;
			});
		 	features.push(turf.multiPolygon(geo));
		 	callback();	
		});
	}, 2);

	q.drain = function() { 	
	    res.send(turf.featureCollection(features));	
	 	next();
	};

	redis.smembers('group:'+ req.params.id, function (err, ids) {
	  	if(err) return next(err);
	  	q.push(ids);
	});
});


server.get('/geojson/:id', function(req,res,next){
	redis.get('set:'+ req.params.id + ':geojson', function (err, result) {
	  	if(err) return next(err);
	 	res.send(JSON.parse(result));	
	 	next();
	});
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