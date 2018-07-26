const fs = require('fs');
const intersect = require('@turf/intersect');
const turf = require('@turf/turf');
const gjfilter = require('geojson-filter');
const topojson = require('topojson');
const clip = require('geojson-clip-polygon');
const _ = require('lodash');
var async = require("async");
const h3 = require('h3-js');

const mongojs = require('mongojs');

var db = mongojs('nl3');
var featuresCollection = db.collection('features'); 
var hashesCollection = db.collection('hashes'); 

const restify = require('restify');
const server = restify.createServer();

server.use(restify.plugins.bodyParser({}));
server.use(restify.plugins.queryParser());

const filter_zoom = 6;



server.get('/api/cell/:zoom/:id', function(req,res,next){

	var id = req.params.id + '-' + req.params.zoom;

	console.log(id);
	hashesCollection.findOne({_id : id }, function(err, o) {
	    
	    if (!o) {
	    	res.send(404);
	    	return next();

	    }
	    console.log("Compacted " + o.hashes.length);

	    var uc = h3.uncompact(o.hashes,Number(req.params.zoom))

	    console.log("Uncompact " + uc.length);

		var geo = h3.h3SetToMultiPolygon(uc,true);
		geo[0] = _.filter(geo[0],function(d){
			return d.length > 2;
		});
		var gj = turf.multiPolygon(geo);
		gj.bbox = turf.bbox(gj);
		console.dir(gj);
	 	res.send(gj);	
	 	next();
	});

});

server.get('/api/cell/search', function(req,res,next){

		var filter_array =[];
		if(!Array.isArray(req.query.filter))
			filter_array = [req.query.filter];
		else
			filter_array = req.query.filter;

		var filter = _.map(filter_array, (f) => {return f + '-' + filter_zoom});
		
		console.dir(filter);

		hashesCollection.find({_id : { $in: filter  }}, function(err, h) {
			if(err || !h) {
				res.send(404);
				return next();
			}
			var hashes = _
				.chain(h)
				.map((h) => {return h.hashes;})
				.flatten()
				.uniq()
				.value();

			hashesCollection.find(
				{ $and : 
					[
						{'hashes' : { $in: hashes  }},
						{'_id' : /^luftrom/}
					]
				}, 
				{_id : 1} , function(err, h2) {
				if(err || !h2) {
					res.send(404);
					return next();
				}

				res.send(h2);	
				next();

			});
		});

});


server.get('/api/cell/search/:pattern', function(req,res,next){

	var regexp = new RegExp(req.params.pattern);
	featuresCollection.find({_id: regexp}, function(err, os) {
		if(err || !os){
			res.send(404);
			return next();
		}
		res.send(_.map(os, (o) => {return o.properties;}));	
		next();
	});
});

server.get('/api/cell/search/class/:value', function(req,res,next){


	var value = req.params.value;
	var key = req.params.key;

	console.log(key + ' '  + value);
	featuresCollection.find({"properties.class": value}, function(err, os) {
		if(err || !os){
			res.send(404);
			return next();
		}
		res.send(_.map(os, (o) => {return o.properties;}));	
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

server.get('/*', restify.plugins.serveStatic({
  directory: './dist',
  file: 'index.html'
}));


server.get("/\/?.*/", restify.plugins.serveStatic({
  directory: './dist',
  default: 'index.html'
}));


server.listen(8081, function() {
  console.log('%s listening at %s', server.name, server.url);
});