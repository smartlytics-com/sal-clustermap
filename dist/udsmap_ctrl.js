'use strict';

System.register(['app/plugins/sdk', 'lodash', 'app/core/time_series', './css/udsmap-panel.css!', './leaflet/leaflet.css!', './leaflet/leaflet.js', './leaflet/supercluster.min.js', './leaflet/L.CanvasOverlay.js'], function (_export, _context) {
  "use strict";

  var MetricsPanelCtrl, _, TimeSeries, supercluster, _createClass, panelDefaults, UdsMapCtrl;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  function _possibleConstructorReturn(self, call) {
    if (!self) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }

    return call && (typeof call === "object" || typeof call === "function") ? call : self;
  }

  function _inherits(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
      throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
    }

    subClass.prototype = Object.create(superClass && superClass.prototype, {
      constructor: {
        value: subClass,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
    if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
  }

  return {
    setters: [function (_appPluginsSdk) {
      MetricsPanelCtrl = _appPluginsSdk.MetricsPanelCtrl;
    }, function (_lodash) {
      _ = _lodash.default;
    }, function (_appCoreTime_series) {
      TimeSeries = _appCoreTime_series.default;
    }, function (_cssUdsmapPanelCss) {}, function (_leafletLeafletCss) {}, function (_leafletLeafletJs) {}, function (_leafletSuperclusterMinJs) {
      supercluster = _leafletSuperclusterMinJs.default;
    }, function (_leafletLCanvasOverlayJs) {}],
    execute: function () {
      _createClass = function () {
        function defineProperties(target, props) {
          for (var i = 0; i < props.length; i++) {
            var descriptor = props[i];
            descriptor.enumerable = descriptor.enumerable || false;
            descriptor.configurable = true;
            if ("value" in descriptor) descriptor.writable = true;
            Object.defineProperty(target, descriptor.key, descriptor);
          }
        }

        return function (Constructor, protoProps, staticProps) {
          if (protoProps) defineProperties(Constructor.prototype, protoProps);
          if (staticProps) defineProperties(Constructor, staticProps);
          return Constructor;
        };
      }();

      panelDefaults = {
        bgColor: null,

        graphSettings: {
          fontColor: 'gray',
          gridColor: 'gray',
          fontSize: 14,
          legendType: 'right',
          ignoreTimeInfluxDB: false,
          limitAspectRatio: true,
          aspectRatio: 2.2
        }
      };

      _export('UdsMapCtrl', UdsMapCtrl = function (_MetricsPanelCtrl) {
        _inherits(UdsMapCtrl, _MetricsPanelCtrl);

        function UdsMapCtrl($scope, $injector, $rootScope) {
          _classCallCheck(this, UdsMapCtrl);

          var _this = _possibleConstructorReturn(this, (UdsMapCtrl.__proto__ || Object.getPrototypeOf(UdsMapCtrl)).call(this, $scope, $injector));

          _.defaultsDeep(_this.panel, panelDefaults);

          _this.$rootScope = $rootScope;

          _this.events.on('init-edit-mode', _this.onInitEditMode.bind(_this));
          _this.events.on('panel-teardown', _this.onPanelTeardown.bind(_this));
          _this.events.on('panel-initialized', _this.render.bind(_this));
          _this.events.on('render', _this.onRender.bind(_this));
          _this.events.on('data-received', _this.onDataReceived.bind(_this));
          _this.events.on('data-error', _this.onDataError.bind(_this));
          _this.events.on('data-snapshot-load', _this.onDataReceived.bind(_this));

          _this.data = [];
          _this.canvasid = ('id' + Math.random() * 100000).replace('.', '');
          _this.divid = ('id' + Math.random() * 100000).replace('.', '');
          _this.ctx = null;
          _this.map = null;
          _this.markers = null;
          _this.index = null;
          _this.ready = false;

          _this.updateMap();
          return _this;
        }

        _createClass(UdsMapCtrl, [{
          key: 'onDataError',
          value: function onDataError() {
            //console.log('Data error');
            this.series = [];
            this.render();
          }
        }, {
          key: 'updateMap',
          value: function updateMap() {
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
        }, {
          key: 'drawingOnCanvas',
          value: function drawingOnCanvas(canvasOverlay, params) {
            var ctx = params.canvas.getContext('2d');
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
        }, {
          key: 'onRender',
          value: function onRender() {
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
              this.markers.on('click', function (e) {
                var clusterId = e.layer.feature.properties.cluster_id;
                var center = e.latlng;
                var expansionZoom;
                if (clusterId) {
                  expansionZoom = that.index.getClusterExpansionZoom(clusterId);
                  that.map.flyTo(center, Math.floor(expansionZoom));
                }
              });

              if (!this.index) {
                this.updateMap();
              }

              //.load(geojson.features);
              //.load(); // Expects an array of Features. geojson.features
              //L.canvasOverlay().drawing(this.drawingOnCanvas).addTo(this.map);
            }

            function createClusterIcon(feature, latlng) {
              if (!feature.properties.cluster) return L.marker(latlng);

              var count = feature.properties.point_count;
              var size = count < 100 ? 'small' : count < 1000 ? 'medium' : 'large';
              var icon = L.divIcon({
                html: '<div><span>' + feature.properties.point_count_abbreviated + '</span></div>',
                className: 'marker-cluster marker-cluster-' + size,
                iconSize: L.point(40, 40)
              });
              return L.marker(latlng, { icon: icon });
            }

            this.updateMap();
          }
        }, {
          key: 'decodeNonHistoricalData',
          value: function decodeNonHistoricalData(fulldata) {
            this.updateMap();
          }
        }, {
          key: 'onDataReceived',
          value: function onDataReceived(dataList) {
            //console.log('dataList: ', dataList);
            if (dataList) {
              var data = [];
              dataList[0].rows.forEach(function (element) {
                if (element && element[0]) {
                  for (var i = 0; i < element[2]; i++) {
                    data.push({
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
                        featureclass: 'waterfall'
                      },
                      geometry: {
                        type: 'Point',
                        coordinates: [element[1], element[0]]
                      }
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
                maxZoom: 17
              }).load(data);
            }
            this.updateMap();
            this.render();
          }
        }, {
          key: 'seriesHandler',
          value: function seriesHandler(seriesData) {
            //console.log('seriesData', seriesData);
            var series = new TimeSeries({
              datapoints: seriesData.datapoints,
              alias: seriesData.target
            });
            return series;
          }
        }, {
          key: 'onInitEditMode',
          value: function onInitEditMode() {
            //console.log('onInitEditMode');
            this.addEditorTab('Options', 'public/plugins/uds-map-panel/editor.html', 2);
          }
        }, {
          key: 'onPanelTeardown',
          value: function onPanelTeardown() {
            //console.log('onPanelTeardown');
            this.$timeout.cancel(this.nextTickPromise);
          }
        }]);

        return UdsMapCtrl;
      }(MetricsPanelCtrl));

      _export('UdsMapCtrl', UdsMapCtrl);

      UdsMapCtrl.templateUrl = 'module.html';
    }
  };
});
//# sourceMappingURL=udsmap_ctrl.js.map
