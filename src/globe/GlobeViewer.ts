import {
  Viewer,
  Ion,
  Terrain,
  Cartesian3,
  Math as CesiumMath,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  EllipsoidTerrainProvider,
  createWorldTerrainAsync,
} from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import type { Edition, ContinentId } from '@/config/regions';
import {
  CONTINENTS,
  DOMESTIC_CAMERA,
  WORLD_CAMERA,
  getContinentById,
} from '@/config/regions';
import { createLayersForEdition, type MapLayerSet } from '@/config/map-providers';

export interface GlobeOptions {
  container: HTMLElement;
  onCoordsUpdate?: (lon: number, lat: number, height: number) => void;
  onReady?: () => void;
}

export class GlobeViewer {
  readonly viewer: Viewer;
  private handler: ScreenSpaceEventHandler;
  private edition: Edition = 'domestic';
  private layers: MapLayerSet;
  private labelsVisible = true;
  private headBase: { alpha: number; beta: number } | null = null;

  constructor(options: GlobeOptions) {
    const ionToken = import.meta.env.VITE_CESIUM_ION_TOKEN?.trim();
    if (ionToken) {
      Ion.defaultAccessToken = ionToken;
    }

    this.viewer = new Viewer(options.container, {
      animation: false,
      timeline: false,
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      fullscreenButton: false,
      infoBox: false,
      selectionIndicator: false,
      creditContainer: document.createElement('div'),
      requestRenderMode: false,
      maximumRenderTimeChange: Infinity,
      terrain: Terrain.fromWorldTerrain({ requestVertexNormals: true }),
    });

    this.viewer.scene.globe.enableLighting = true;
    this.viewer.scene.globe.showGroundAtmosphere = true;
    if (this.viewer.scene.skyAtmosphere) {
      this.viewer.scene.skyAtmosphere.show = true;
    }
    this.viewer.scene.fog.enabled = true;
    this.viewer.scene.globe.maximumScreenSpaceError = 1.2;
    this.viewer.scene.globe.tileCacheSize = 1000;
    this.viewer.resolutionScale = Math.min(window.devicePixelRatio, 2);

    // 移除 Cesium 默认底图，换用高清源
    this.viewer.imageryLayers.removeAll();
    this.layers = createLayersForEdition('domestic');
    this.viewer.imageryLayers.add(this.layers.base);
    if (this.layers.labels) {
      this.viewer.imageryLayers.add(this.layers.labels);
    }

    this.handler = new ScreenSpaceEventHandler(this.viewer.scene.canvas);
    this.handler.setInputAction(() => this.emitCoords(options), ScreenSpaceEventType.MOUSE_MOVE);
    this.handler.setInputAction(() => this.emitCoords(options), ScreenSpaceEventType.WHEEL);

    this.flyToCamera(DOMESTIC_CAMERA.lon, DOMESTIC_CAMERA.lat, DOMESTIC_CAMERA.height, 0);
    options.onReady?.();
  }

  get currentEdition(): Edition {
    return this.edition;
  }

  get providerName(): string {
    return this.layers.providerName;
  }

  setEdition(edition: Edition): void {
    if (edition === this.edition) return;
    this.edition = edition;
    this.swapLayers(createLayersForEdition(edition));

    if (edition === 'domestic') {
      this.flyToCamera(DOMESTIC_CAMERA.lon, DOMESTIC_CAMERA.lat, DOMESTIC_CAMERA.height);
    } else {
      this.flyToWorld();
    }
  }

  flyToWorld(): void {
    this.flyToCamera(WORLD_CAMERA.lon, WORLD_CAMERA.lat, WORLD_CAMERA.height);
  }

  flyToContinent(id: ContinentId): void {
    const region = getContinentById(id);
    this.flyToCamera(region.camera.lon, region.camera.lat, region.camera.height);
  }

  zoomIn(): void {
    const camera = this.viewer.camera;
    const height = camera.positionCartographic.height * 0.55;
    camera.flyTo({
      destination: Cartesian3.fromRadians(
        camera.positionCartographic.longitude,
        camera.positionCartographic.latitude,
        Math.max(height, 500),
      ),
      duration: 0.35,
    });
  }

  zoomOut(): void {
    const camera = this.viewer.camera;
    const height = camera.positionCartographic.height * 1.8;
    camera.flyTo({
      destination: Cartesian3.fromRadians(
        camera.positionCartographic.longitude,
        camera.positionCartographic.latitude,
        Math.min(height, 25_000_000),
      ),
      duration: 0.35,
    });
  }

  resetView(): void {
    if (this.edition === 'domestic') {
      this.flyToCamera(DOMESTIC_CAMERA.lon, DOMESTIC_CAMERA.lat, DOMESTIC_CAMERA.height);
    } else {
      this.flyToWorld();
    }
  }

  setLabelsVisible(visible: boolean): void {
    this.labelsVisible = visible;
    if (this.layers.labels) {
      this.layers.labels.show = visible;
    }
  }

  async setTerrainEnabled(enabled: boolean): Promise<void> {
    if (enabled) {
      try {
        this.viewer.terrainProvider = await createWorldTerrainAsync({
          requestVertexNormals: true,
        });
      } catch {
        this.viewer.terrainProvider = new EllipsoidTerrainProvider();
      }
    } else {
      this.viewer.terrainProvider = new EllipsoidTerrainProvider();
    }
  }

  setAtmosphereVisible(visible: boolean): void {
    if (this.viewer.scene.skyAtmosphere) {
      this.viewer.scene.skyAtmosphere.show = visible;
    }
    this.viewer.scene.globe.showGroundAtmosphere = visible;
  }

  setSatelliteVisible(visible: boolean): void {
    this.layers.base.show = visible;
  }

  /** 智能戒指倾斜：左右旋转地球 */
  rotateByTilt(gamma: number, beta: number): void {
    const camera = this.viewer.camera;
    const deltaLon = CesiumMath.toRadians(gamma * 0.15);
    const deltaLat = CesiumMath.toRadians(-beta * 0.1);
    camera.rotateRight(deltaLon);
    camera.rotateUp(deltaLat);
  }

  /** 智能眼镜头部追踪：以初始朝向为基准环视地球 */
  lookByHead(alpha: number, beta: number): void {
    if (!this.headBase) {
      this.headBase = { alpha, beta };
      return;
    }

    const dAlpha = this.wrapDegrees(alpha - this.headBase.alpha);
    const dBeta = CesiumMath.clamp(beta - this.headBase.beta, -60, 60);
    const camera = this.viewer.camera;

    camera.setView({
      destination: camera.position,
      orientation: {
        heading: CesiumMath.toRadians(dAlpha),
        pitch: CesiumMath.toRadians(-dBeta * 0.85),
        roll: 0,
      },
    });
  }

  /** 重新校准眼镜头部追踪中心 */
  calibrateHead(): void {
    this.headBase = null;
  }

  /** 智能手杖挥动：切换下一个大洲（仅国外版） */
  cycleContinent(direction: 1 | -1): void {
    if (this.edition !== 'international') return;
    const ids = CONTINENTS.map((c) => c.id);
    const currentHeight = this.viewer.camera.positionCartographic.height;
    let nearestIdx = 0;
    let nearestDist = Infinity;
    const camLon = CesiumMath.toDegrees(this.viewer.camera.positionCartographic.longitude);
    const camLat = CesiumMath.toDegrees(this.viewer.camera.positionCartographic.latitude);

    ids.forEach((id, i) => {
      const r = getContinentById(id);
      const dist = Math.hypot(r.camera.lon - camLon, r.camera.lat - camLat);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    });

    const nextIdx = (nearestIdx + direction + ids.length) % ids.length;
    this.flyToContinent(ids[nextIdx]!);
    void currentHeight;
  }

  destroy(): void {
    this.handler.destroy();
    this.viewer.destroy();
  }

  private swapLayers(next: MapLayerSet): void {
    const layers = this.viewer.imageryLayers;
    while (layers.length > 0) {
      layers.remove(layers.get(0)!);
    }
    this.layers = next;
    layers.add(next.base);
    if (next.labels) {
      next.labels.show = this.labelsVisible;
      layers.add(next.labels);
    }
  }

  private flyToCamera(lon: number, lat: number, height: number, duration = 1.8): void {
    this.viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(lon, lat, height),
      duration,
      easingFunction: (t: number) => 1 - Math.pow(1 - t, 3),
    });
  }

  private emitCoords(options: GlobeOptions): void {
    const carto = this.viewer.camera.positionCartographic;
    const lon = CesiumMath.toDegrees(carto.longitude);
    const lat = CesiumMath.toDegrees(carto.latitude);
    const height = carto.height;
    options.onCoordsUpdate?.(lon, lat, height);
  }

  private wrapDegrees(deg: number): number {
    let d = deg % 360;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    return d;
  }
}
