import { useEffect, useRef, useState } from 'react';

const ARCGIS_IMAGERY = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const ARCGIS_TERRAIN = 'https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer';
const GIBS_NIGHT =
  'https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/VIIRS_CityLights_2012/default/2012-01-01/250m/{TileMatrix}/{TileRow}/{TileCol}.jpg';

export function CesiumEarth() {
  const container = useRef(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let viewer = null;
    let cancelled = false;

    (async () => {
      const Cesium = await import('cesium');
      if (cancelled || !container.current) return;

      viewer = new Cesium.Viewer(container.current, {
        baseLayer: false,
        terrainProvider: new Cesium.EllipsoidTerrainProvider(),
        animation: false,
        timeline: false,
        baseLayerPicker: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        navigationHelpButton: false,
        infoBox: false,
        selectionIndicator: false,
        fullscreenButton: false,
        vrButton: false,
        shouldAnimate: true,
      });

      viewer.imageryLayers.add(
        new Cesium.ImageryLayer(
          new Cesium.UrlTemplateImageryProvider({
            url: ARCGIS_IMAGERY,
            maximumLevel: 19,
            credit: 'Imagery © Esri, Maxar, Earthstar Geographics',
          }),
        ),
      );

      try {
        const night = new Cesium.ImageryLayer(
          new Cesium.WebMapTileServiceImageryProvider({
            url: GIBS_NIGHT,
            layer: 'VIIRS_CityLights_2012',
            style: 'default',
            format: 'image/jpeg',
            tileMatrixSetID: '250m',
            maximumLevel: 8,
            credit: 'NASA GIBS · VIIRS City Lights',
          }),
          { dayAlpha: 0, nightAlpha: 0.92, brightness: 1.7 },
        );
        viewer.imageryLayers.add(night);
      } catch (error) {
        console.warn('Night lights layer unavailable', error);
      }

      try {
        const terrain = await Cesium.ArcGISTiledElevationTerrainProvider.fromUrl(ARCGIS_TERRAIN);
        if (cancelled || !viewer || viewer.isDestroyed()) return;
        viewer.terrainProvider = terrain;
      } catch (error) {
        console.warn('Cesium terrain unavailable, using ellipsoid', error);
      }

      if (cancelled || !viewer || viewer.isDestroyed()) return;
      viewer.scene.globe.enableLighting = true;
      viewer.scene.globe.showGroundAtmosphere = true;
      viewer.scene.globe.depthTestAgainstTerrain = false;
      viewer.scene.skyAtmosphere.show = true;
      const localNoon = new Date();
      localNoon.setUTCHours(3, 0, 0, 0);
      viewer.clock.currentTime = Cesium.JulianDate.fromDate(localNoon);
      viewer.clock.multiplier = 1;
      viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(139.7, 35.7, 1_400_000),
        orientation: { heading: 0, pitch: -1.45, roll: 0 },
      });

      const cities = [
        ['北京', 116.4, 39.9],
        ['上海', 121.47, 31.23],
        ['东京', 139.69, 35.68],
        ['纽约', -74.0, 40.71],
        ['伦敦', -0.12, 51.5],
        ['悉尼', 151.2, -33.87],
      ];
      for (const [name, lon, lat] of cities) {
        viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(lon, lat, 120000),
          point: { pixelSize: 5, color: Cesium.Color.fromCssColorString('#75e6ff') },
          label: {
            text: name,
            font: '13px monospace',
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -8),
          },
        });
      }

      if (!cancelled) setStatus('ready');
    })().catch((error) => {
      if (!cancelled) {
        console.error(error);
        setStatus('error');
      }
    });

    return () => {
      cancelled = true;
      if (viewer && !viewer.isDestroyed()) viewer.destroy();
      viewer = null;
    };
  }, []);

  return (
    <div className="cesium-wrap">
      <div ref={container} className="cesium-viewer" />
      {status === 'loading' && <div className="cesium-loading">正在载入 Cesium 地球轨道视图…</div>}
      {status === 'error' && <div className="cesium-loading">Cesium 加载失败，请检查网络后返回太空重试。</div>}
    </div>
  );
}
