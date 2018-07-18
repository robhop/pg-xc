const turf = require('@turf/turf');
const _ = require('lodash');
const h3 = require('h3-js');
const async = require("async");
const mongojs = require('mongojs');

const { spawn } = require('child_process');
const argv = require('minimist')(process.argv.slice(2));

if(!argv._.length) 
 	process.exit();

if(!argv.f) 
 	process.exit();

if(!argv.t) 
 	process.exit();

var q = async.queue(function(task, callback) {
	console.dir(task);

	//const child = spawn('node', ['child_polyfill.js', task, '-f', argv.f, '-t', argv.t]);

	//child.on('exit', function (code, signal) {
	//	if(code) console.log('child process exited with ' + `code ${code} and signal ${signal}`);
	  	callback();
	//});

}, 1);

// assign a callback
q.drain = function() {
	db.close();
  console.log('all items have been processed');
};


var db = mongojs('nl3');
var featuresCollection = db.collection('features');

featuresCollection.find().forEach(function(err, feature) {
    if (!feature) {
    	return;
    }
        
    q.push(feature._id);
});

