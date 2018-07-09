const jq = require('node-jq');
const fs = require('fs');
const argv = require('minimist')(process.argv.slice(2));


const filter = '.';
const jsonPath = argv._[0];
const options = {input: 'json'};

const data = JSON.parse(fs.readFileSync(argv._[0], 'utf8'));

//console.log(data);

jq.run(filter, data, options)
  .then((output) => {
    console.log(output);
    
  })
  .catch((err) => {
    console.error(err);
  })