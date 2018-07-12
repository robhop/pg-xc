const argv = require('minimist')(process.argv.slice(2));
const _ = require('lodash');
const fs = require('fs');
var iconv = require('iconv-lite');
const fixUtf8 = require('fix-utf8')


var topojsonData = JSON.parse(fs.readFileSync(argv._[0], 'utf8')); 

_.each(topojsonData.objects.kommuner_med_hav.geometries,function(g){

	var buff = g.properties.name;
	var buff   = buff

					.replace(/Ä/g, 'á')
					.replace(/Ã¦/g, 'æ')
					.replace(/Ã¥/g, 'æ')
					.replace(/Â/g, '/')
					.replace(/Ã/g, 'Ø')
					.replace(/Ã¡/g, 'á')
					.replace(/Ã/g, 'Å')
					.replace(/Ã¸/g, 'ø');
	console.log(buff);

	g.properties.name = buff;
});




fs.writeFileSync(argv.o,JSON.stringify(topojsonData), "utf8");