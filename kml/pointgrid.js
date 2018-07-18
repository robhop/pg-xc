var Redis = require('ioredis');
const turf = require('@turf/turf');
const _ = require('lodash');
const h3 = require('h3-js');
const async = require("async");

const { spawn } = require('child_process');
const argv = require('minimist')(process.argv.slice(2));

if(!argv._.length) 
 	process.exit();

if(!argv.z) 
 	process.exit();

var redis = new Redis(6379);


var q = async.queue(function(task, callback) {
	console.dir(task);
    //polyfillSet(task.id, task.zoom, callback);

	const child = spawn('node', ['child_pointgrid.js', task, '-z', '' + argv.z]);

	child.on('exit', function (code, signal) {
		if(code) console.log('child process exited with ' + `code ${code} and signal ${signal}`);
	  	callback();
	});

}, 2);

// assign a callback
q.drain = function() {
	redis.end();
    console.log('all items have been processed');
};

redis.smembers('properties:id').then(function (result) {
	_
		.chain(result)
		.filter((o) => { return o.match(argv._); })
		.each(o => {
			q.push(o);
		})
		.value();
});