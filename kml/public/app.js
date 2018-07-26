new Vue({
  el: '#app',
  data: {
  	zoom: 5,
  	zoom_levels: [3,4,5,6,7],
  	kommune: null,
  	kommuner: [],
	  map: null,
	  tileLayer: null,
	  layers: [
	    {
	      id: 0,
	      name: 'Restaurants',
	      active: false,
	      features: [],
	    },
	  ],
	},  
	watch: {
    // whenever question changes, this function will run
    kommune: function (newSelection, oldSelection) {
    	var self = this;
		  this.$http.get('/cell/' + this.zoom + '/' + newSelection).then(response => {

		    // get body data
		    var leafletLayer = L.geoJSON(response.body, {});
		    var layer = {
		    	id: newSelection,
		    	layer : leafletLayer
		    };
		    self.layers.push(layer);
		    leafletLayer.addTo(self.map);

		  }, response => {
		    // error callback
		  });
    }
  },
  mounted() {
  	this.initMap();
  	this.initLayers();
  	this.initGroups();
	},
  methods: {
  	initMap() {
			this.map = L.map('map').setView([65, 14], 4);
			this.tileLayer = L.tileLayer(
			  'https://cartodb-basemaps-{s}.global.ssl.fastly.net/rastertiles/voyager/{z}/{x}/{y}.png',
			  {
			    maxZoom: 13,
			    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attribution">CARTO</a>',
			  }
			);
			this.tileLayer.addTo(this.map);
  	},
  	initLayers() {},
  	initGroups() {
  		var self = this;
		  this.$http.get('/groups/kommune').then(response => {

		    // get body data
		    self.kommuner = response.body;
		    self.kommune = self.kommuner[0];

		  }, response => {
		    // error callback
		  });
  	},
	}
});