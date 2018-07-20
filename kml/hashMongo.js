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

	console.dir("Got grid for " + task._id + ' ' + grid.features.length);	

	var points = _
		.chain(grid.features)
		.map((f) => {
			var c = f.geometry.coordinates;
			return h3.geoToH3(c[1], c[0], zoom);
		})
		.value();

	console.dir("Got points for " + task._id + ' ' + points.length);	

	const inside = new Set();
	for (var i = points.length - 1; i >= 0; i--) {
		var r = h3.h3ToGeo(points[i],true);
		var p = turf.point(_.reverse(r));
		if(turf.inside(p,geojson)) inside.add(points[i])
	};

	console.dir("Got inside for " + task._id + ' ' + inside.size);

	var newKey = task._id + '-' + zoom;
	var newDoc = {
		_id: newKey,
		hashes: Array.from(inside)
	};
	console.dir("Got hashes for " + task._id + ' ' + newDoc.hashes.length);

	if(argv.q) {
		var tmp = _.filter(newDoc.hashes,h3.h3IsValid);
		newDoc.hashes = h3.compact(tmp);
	} 	

	console.dir("Got compacted hashes for " + task._id + ' ' + newDoc.hashes.length);

	hashesCollection.update({_id:newDoc._id}, newDoc, {upsert: true},  function (err) {
		if(err)
			console.log('Error ' );

		callback();
	});

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

