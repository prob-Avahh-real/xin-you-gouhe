import { GlobeViewer } from '@/globe/GlobeViewer';
import { CONTINENTS, type Edition, type ContinentId } from '@/config/regions';
import { SmartInput } from '@/devices/smart-input';
import { SmartGlasses, type GlassesVoiceCommand } from '@/devices/smart-glasses';

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el;
}

function formatCoords(lon: number, lat: number, height: number): string {
  const lonStr = `${Math.abs(lon).toFixed(4)}°${lon >= 0 ? 'E' : 'W'}`;
  const latStr = `${Math.abs(lat).toFixed(4)}°${lat >= 0 ? 'N' : 'S'}`;
  const altKm = (height / 1000).toFixed(0);
  return `${latStr} · ${lonStr} · ${altKm} km`;
}

export function initApp(): GlobeViewer {
  const loading = $('loadingOverlay');
  const editionLabel = $('editionLabel');
  const continentPanel = $('continentPanel');
  const continentGrid = $('continentGrid');
  const providerHint = $('providerHint');
  const coordsDisplay = $('coordsDisplay');
  const settingsDrawer = $('settingsDrawer');

  const globe = new GlobeViewer({
    container: $('cesiumContainer'),
    onCoordsUpdate: (lon, lat, h) => {
      coordsDisplay.textContent = formatCoords(lon, lat, h);
    },
    onReady: () => {
      loading.classList.add('hidden');
      editionLabel.textContent = `国内版 · ${globe.providerName}`;
      providerHint.textContent = globe.providerName;
    },
  });

  CONTINENTS.forEach((c) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'continent-btn';
    btn.dataset.continent = c.id;
    btn.innerHTML = `<span class="emoji">${c.emoji}</span><span class="name">${c.name}</span>`;
    btn.addEventListener('click', () => {
      globe.flyToContinent(c.id);
      highlightContinent(c.id);
    });
    continentGrid.appendChild(btn);
  });

  function highlightContinent(id: ContinentId | null): void {
    continentGrid.querySelectorAll('.continent-btn').forEach((el) => {
      el.classList.toggle('active', (el as HTMLElement).dataset.continent === id);
    });
  }

  function setEdition(edition: Edition): void {
    globe.setEdition(edition);
    const isIntl = edition === 'international';
    continentPanel.hidden = !isIntl;
    editionLabel.textContent = isIntl
      ? `国外版 · ${globe.providerName}`
      : `国内版 · ${globe.providerName}`;
    providerHint.textContent = globe.providerName;

    document.querySelectorAll('.edition-tabs .tab').forEach((tab) => {
      tab.classList.toggle('active', (tab as HTMLElement).dataset.edition === edition);
    });
    highlightContinent(null);
  }

  function handleGlassesCommand(cmd: GlassesVoiceCommand): void {
    switch (cmd.type) {
      case 'edition':
        setEdition(cmd.edition);
        break;
      case 'continent':
        globe.flyToContinent(cmd.id);
        highlightContinent(cmd.id);
        break;
      case 'world':
        globe.flyToWorld();
        highlightContinent(null);
        break;
      case 'zoom':
        if (cmd.direction === 'in') globe.zoomIn();
        else globe.zoomOut();
        break;
      case 'reset':
        globe.resetView();
        break;
      case 'cycle':
        globe.cycleContinent(cmd.direction);
        break;
      case 'settings':
        settingsDrawer.hidden = false;
        break;
      case 'calibrate':
        globe.calibrateHead();
        break;
    }
  }

  $('editionTabs').addEventListener('click', (e) => {
    const target = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-edition]');
    if (!target?.dataset.edition) return;
    setEdition(target.dataset.edition as Edition);
  });

  $('btnWorldView').addEventListener('click', () => {
    globe.flyToWorld();
    highlightContinent(null);
  });

  $('btnZoomIn').addEventListener('click', () => globe.zoomIn());
  $('btnZoomOut').addEventListener('click', () => globe.zoomOut());
  $('btnReset').addEventListener('click', () => globe.resetView());

  $('btnSettings').addEventListener('click', () => {
    settingsDrawer.hidden = false;
  });
  $('btnCloseSettings').addEventListener('click', () => {
    settingsDrawer.hidden = true;
  });

  const toggleSatellite = $('toggleSatellite') as HTMLInputElement;
  const toggleTerrain = $('toggleTerrain') as HTMLInputElement;
  const toggleLabels = $('toggleLabels') as HTMLInputElement;
  const toggleAtmosphere = $('toggleAtmosphere') as HTMLInputElement;

  toggleSatellite.addEventListener('change', () => globe.setSatelliteVisible(toggleSatellite.checked));
  toggleTerrain.addEventListener('change', () => void globe.setTerrainEnabled(toggleTerrain.checked));
  toggleLabels.addEventListener('change', () => globe.setLabelsVisible(toggleLabels.checked));
  toggleAtmosphere.addEventListener('change', () => globe.setAtmosphereVisible(toggleAtmosphere.checked));

  const glasses = new SmartGlasses(
    {
      onHeadLook: (alpha, beta) => globe.lookByHead(alpha, beta),
      onVoiceCommand: handleGlassesCommand,
    },
    { voiceDot: 'voiceDot', statusEl: 'glassesStatus' },
  );

  const smart = new SmartInput(
    {
      onTilt: (g, b) => globe.rotateByTilt(g, b),
      onSwing: (dir) => globe.cycleContinent(dir),
      onTap: () => globe.resetView(),
      onShake: () => {
        if (globe.currentEdition === 'international') {
          globe.cycleContinent(1);
        }
      },
    },
    { skipOrientation: () => glasses.handlesOrientation },
  );

  void smart.enable();
  void glasses.enable();

  return globe;
}
