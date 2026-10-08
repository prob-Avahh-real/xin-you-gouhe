import {
  Credit,
  ImageryLayer,
  UrlTemplateImageryProvider,
  WebMapTileServiceImageryProvider,
} from 'cesium';
import type { Edition } from './regions';

export interface MapLayerSet {
  base: ImageryLayer;
  labels?: ImageryLayer;
  providerName: string;
}

const NO_CREDIT = new Credit('', false);

function esriWorldImagery(): ImageryLayer {
  const provider = new UrlTemplateImageryProvider({
    url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    credit: NO_CREDIT,
    maximumLevel: 19,
    enablePickFeatures: false,
  });
  return new ImageryLayer(provider);
}

function esriWorldLabels(): ImageryLayer {
  const provider = new UrlTemplateImageryProvider({
    url: 'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    credit: NO_CREDIT,
    maximumLevel: 19,
    enablePickFeatures: false,
  });
  return new ImageryLayer(provider);
}

function mapboxSatellite(token: string): ImageryLayer {
  const provider = new UrlTemplateImageryProvider({
    url: `https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}@2x.webp?access_token=${token}`,
    credit: NO_CREDIT,
    maximumLevel: 22,
    enablePickFeatures: false,
  });
  return new ImageryLayer(provider);
}

function mapboxLabels(token: string): ImageryLayer {
  const provider = new UrlTemplateImageryProvider({
    url: `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=${token}`,
    credit: NO_CREDIT,
    maximumLevel: 22,
    enablePickFeatures: false,
    hasAlphaChannel: true,
  });
  return new ImageryLayer(provider);
}

function tiandituImagery(key: string): ImageryLayer {
  const provider = new WebMapTileServiceImageryProvider({
    url: `https://t{s}.tianditu.gov.cn/img_w/wmts?tk=${key}`,
    layer: 'img',
    style: 'default',
    format: 'tiles',
    tileMatrixSetID: 'w',
    subdomains: ['0', '1', '2', '3', '4', '5', '6', '7'],
    maximumLevel: 18,
    credit: NO_CREDIT,
  });
  return new ImageryLayer(provider);
}

function tiandituLabels(key: string): ImageryLayer {
  const provider = new WebMapTileServiceImageryProvider({
    url: `https://t{s}.tianditu.gov.cn/cia_w/wmts?tk=${key}`,
    layer: 'cia',
    style: 'default',
    format: 'tiles',
    tileMatrixSetID: 'w',
    subdomains: ['0', '1', '2', '3', '4', '5', '6', '7'],
    maximumLevel: 18,
    credit: NO_CREDIT,
  });
  return new ImageryLayer(provider);
}

/** 国内版：天地图高清卫星 + 中文注记；无 key 时降级 Esri */
export function createDomesticLayers(): MapLayerSet {
  const tiandituKey = import.meta.env.VITE_TIANDITU_KEY?.trim();

  if (tiandituKey) {
    return {
      base: tiandituImagery(tiandituKey),
      labels: tiandituLabels(tiandituKey),
      providerName: '天地图 · 高清卫星',
    };
  }

  return {
    base: esriWorldImagery(),
    labels: esriWorldLabels(),
    providerName: 'Esri 高清影像（请配置 VITE_TIANDITU_KEY 启用天地图）',
  };
}

/** 国外版：Mapbox 超清卫星优先，否则 Esri 19 级影像 */
export function createInternationalLayers(): MapLayerSet {
  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN?.trim();

  if (mapboxToken) {
    return {
      base: mapboxSatellite(mapboxToken),
      labels: mapboxLabels(mapboxToken),
      providerName: 'Mapbox · 超清卫星 @2x',
    };
  }

  return {
    base: esriWorldImagery(),
    labels: esriWorldLabels(),
    providerName: 'Esri 高清影像 L19（可配置 VITE_MAPBOX_TOKEN 升级）',
  };
}

export function createLayersForEdition(edition: Edition): MapLayerSet {
  return edition === 'domestic'
    ? createDomesticLayers()
    : createInternationalLayers();
}
