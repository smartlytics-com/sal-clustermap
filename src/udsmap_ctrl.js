import {
  MetricsPanelCtrl,
} from 'app/plugins/sdk';
import _ from 'lodash';
import TimeSeries from 'app/core/time_series';

import './css/udsmap-panel.css!';
import './leaflet/leaflet.css!';
import './leaflet/leaflet.js';
import supercluster from './leaflet/supercluster.min.js';
import './leaflet/L.CanvasOverlay.js';

const panelDefaults = {
  bgColor: null,

  graphSettings: {
    fontColor: 'gray',
    gridColor: 'gray',
    fontSize: 14,
    legendType: 'right',
    ignoreTimeInfluxDB: false,
    limitAspectRatio: true,
    aspectRatio: 2.2,
  },
};

export class UdsMapCtrl extends MetricsPanelCtrl {

  constructor($scope, $injector, $rootScope) {
    super($scope, $injector);
    _.defaultsDeep(this.panel, panelDefaults);

    this.$rootScope = $rootScope;

    this.events.on('init-edit-mode', this.onInitEditMode.bind(this));
    this.events.on('panel-teardown', this.onPanelTeardown.bind(this));
    this.events.on('panel-initialized', this.render.bind(this));
    this.events.on('render', this.onRender.bind(this));
    this.events.on('data-received', this.onDataReceived.bind(this));
    this.events.on('data-error', this.onDataError.bind(this));
    this.events.on('data-snapshot-load', this.onDataReceived.bind(this));

    this.data = [];
    this.canvasid = ('id' + (Math.random() * 100000)).replace('.', '');
    this.divid = ('id' + (Math.random() * 100000)).replace('.', '');
    this.ctx = null;
    this.map = null;
    this.markers = null;
    this.index = null;
    this.ready = false;

    this.updateMap();
  }

  onDataError() {
    //console.log('Data error');
    this.series = [];
    this.render();
  }

  updateMap() {
    //console.log('updateMap ?', this.map, this.index, this.markers);
    if (this.map && this.index && this.markers) {
      //console.log('updateMap - YES');
      var bounds = this.map.getBounds();
      var bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()];
      var clusters = this.index.getClusters(bbox, Math.floor(this.map.getZoom()));
      //console.log('clusters: ', clusters);
      this.markers.clearLayers();
      this.markers.addData(clusters);
    }
  }

  drawingOnCanvas(canvasOverlay, params) {
    const ctx = params.canvas.getContext('2d');
    ctx.clearRect(0, 0, params.canvas.width, params.canvas.height);
    ctx.fillStyle = 'rgba(255,116,0, 0.2)';
    for (var i = 0; i < data.length; i++) {
      var d = data[i];
      if (params.bounds.contains([d[0], d[1]])) {
        var dot = canvasOverlay._map.latLngToContainerPoint([d[0], d[1]]);
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();
      }
    }
  }

  onRender() {
    //console.log('render!');
    if (this.ctx == null) {
      if (document.getElementById(this.canvasid) != null) {
        this.ctx = document.getElementById(this.canvasid).getContext('2d');
      }
    }

    if (this.map == null) {
      this.map = L.map(this.divid).setView([24, 32], 2);

      // create the tile layer with correct attribution
      var osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      //var osmUrl='http://{s}.sm.mapstack.stamen.com/(toner,$212124[@2],$212124[@20],$212124[@60])/{z}/{x}/{y}.png';
      //var osmUrl='http://{s}.sm.mapstack.stamen.com/(toner,$fff[difference],$fff[@23],$fff[hsl-saturation@20])/{z}/{x}/{y}.png';
      //var osmUrl='http://{s}.sm.mapstack.stamen.com/(toner,mask=!mapbox-water,alpha=60)/{z}/{x}/{y}.png';
      //var osmAttrib = 'Map data © <a href="https://openstreetmap.org">OpenStreetMap</a> contributors';
      //var osm = new L.TileLayer(osmUrl, {minZoom: 1, maxZoom: 13, attribution: osmAttrib});
      var osm = new L.TileLayer(osmUrl, { minZoom: 1, maxZoom: 13 });
      // start the map in South-East England
      this.map.addLayer(osm);

      this.markers = L.geoJson(null, { pointToLayer: createClusterIcon }).addTo(this.map);

      var bound = this.updateMap.bind(this);
      this.map.on('moveend', bound);

      var that = this;
      this.markers.on('click', (e) => {
        var clusterId = e.layer.feature.properties.cluster_id;
        var center = e.latlng;
        var expansionZoom;
        if (clusterId) {
          expansionZoom = that.index.getClusterExpansionZoom(clusterId);
          that.map.flyTo(center, Math.floor(expansionZoom));
        }
      });

      setTimeout(() => this.map.invalidateSize(), 100)

      if (!this.index) {
        this.updateMap();
      }

      //.load(geojson.features);
      //.load(); // Expects an array of Features. geojson.features
      //L.canvasOverlay().drawing(this.drawingOnCanvas).addTo(this.map);
    }

    function createClusterIcon(feature, latlng) {
      if (!feature.properties.cluster) return L.marker(latlng);

      const count = feature.properties.point_count;
      const size = count < 100 ? 'small' : count < 1000 ? 'medium' : 'large';
      const icon = L.divIcon({
        html: `<div><span>${feature.properties.point_count_abbreviated}</span></div>`,
        className: `marker-cluster marker-cluster-${size}`,
        iconSize: L.point(40, 40),
      });
      return L.marker(latlng, { icon });
    }

    this.updateMap();
  }

  decodeNonHistoricalData(fulldata) {
    this.updateMap();
  }

  //***************************************************
  // Data received
  //***************************************************
  onDataReceived(dataList) {
    //console.log('dataList: ', dataList);
    if (dataList) {
      var data = [];
      dataList[0].rows.forEach(function(element) {
        if (element && element[0]) {
          for (let i = 0; i < element[2]; i++) {
            data.push(
              {
                type: 'Feature',
                properties: {
                  scalerank: 2,
                  name: 'Niagara Falls',
                  comment: null,
                  name_alt: null,
                  lat_y: element[1],
                  long_x: element[0],
                  region: 'North America',
                  subregion: null,
                  featureclass: 'waterfall',
                },
                geometry: {
                  type: 'Point',
                  coordinates: [element[1], element[0]],
                },
              });
          }
        }
      });
      //console.log('transformed data:', data);

      // Retrieve Points data.
      this.index = supercluster({
        log: false,
        radius: 60,
        extent: 256,
        maxZoom: 17,
      }).load(data);
    }
    this.updateMap();
    this.render();
  }

  //***************************************************
  // seriesHandler
  //***************************************************
  seriesHandler(seriesData) {
    //console.log('seriesData', seriesData);
    var series = new TimeSeries({
      datapoints: seriesData.datapoints,
      alias: seriesData.target,
    });
    return series;
  }

  onInitEditMode() {
    //console.log('onInitEditMode');
    this.addEditorTab('Options', 'public/plugins/uds-map-panel/editor.html', 2);
  }

  onPanelTeardown() {
    //console.log('onPanelTeardown');
    this.$timeout.cancel(this.nextTickPromise);
  }

}

UdsMapCtrl.templateUrl = 'module.html';