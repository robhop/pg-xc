const turf = require('@turf/turf');
const _ = require('lodash');
const h3 = require('h3-js');
const async = require("async");
const mongojs = require('mongojs');

const { spawn } = require('child_process');
const argv = require('minimist')(process.argv.slice(2));

var pattern;
if(!argv._.length) 
 	pattern = /.*/;
else
	pattern = new RegExp(argv._);

if(!argv.z) 
 	process.exit();

 const zoom = argv.z;

var db = mongojs('nl3');
var featuresCollection = db.collection('features'); 
var hashesCollection = db.collection('hashes'); 

var q = async.queue(function(task, callback) {
	console.dir(task._id);

	var km = h3.edgeLength(zoom,'km');
	var geojson = task.feature;
	
	var grid = turf.pointGrid(turf.bbox(geojson),km,{mask:geojson});

	var points = _
		.chain(grid.features)
		.map((f) => {
			var c = f.geometry.coordinates;
			return h3.geoToH3(c[1], c[0], zoom);
		})
		.value();

	const inside = new Set();
	for (var i = points.length - 1; i >= 0; i--) {
		var r = h3.h3ToGeo(points[i],true);
		var p = turf.point(_.reverse(r));
		if(turf.inside(p,geojson)) inside.add(points[i])
	};


	var newKey = task._id + '-' + zoom;
	var newDoc = {
		_id: newKey,
		hashes: Array.from(inside)
	};

	hashesCollection.insert(newDoc, callback);

}, 3);

// assign a callback
q.drain = function() {
	db.close();
  console.log('all items have been processed');
};


featuresCollection.find({_id : pattern }, function(err, features) {
    if (!features) {
    	return;
    }
    _.each(features, (f) => {
    	q.push(f);
    });

});

