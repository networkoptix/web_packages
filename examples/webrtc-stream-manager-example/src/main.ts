// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import './style.css';

import { description } from '../package.json';
import { Subject, Subscription, takeUntil } from 'rxjs';
import { WebRTCStreamManager } from './open_check_excluded';
import { ApiVersions, TargetStream, AvailableStreams, fetchWithRedirectAuthorization } from '@networkoptix/webrtc-stream-manager';

WebRTCStreamManager.logger = console;

const newStream$ = new Subject<void>();

const urlParams = new URLSearchParams(window.location.search);

let cloudInstance = window.localStorage.getItem('cloudInstance');

const tokenEndpoint = `${cloudInstance}/oauth/token/`;
const systemsEndpoint = `${cloudInstance}/api/systems/`;

const authCodeGrant = {
  grant_type: 'authorization_code',
  response_type: 'token',
  code: urlParams.get('code'),
};

const getToken = (payload: unknown = authCodeGrant) =>
  fetch(tokenEndpoint, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  });

const forms = ['endpoint-data', 'cloud-data'] as const;

interface TokenInfo {
  access_token: string;
  refresh_token: string;
  expires_in: string;
  expires_at: string;
  token_type: string;
  scope: string;
}

interface BasicSystemInfo {
  id: string;
  name: string;
  stateOfHealth: string;
  version: string;
}

interface BasicCameraInfo {
  id: string;
  name: string;
  status: string;
  serverId: string;
}

let cloudToken: TokenInfo;
let systemToken: TokenInfo;
let systemsInfo: BasicSystemInfo[];
let cameras: BasicCameraInfo[];
let systemRelay: string;
let systemId: string;

const show = (formName: (typeof forms)[number] = 'cloud-data') => {
  document.querySelector<HTMLFormElement>(
    `[name="${formName}"]`
  ).style.display = 'block';
  forms
    .filter((form) => form !== formName)
    .forEach((form) => {
      document.querySelector<HTMLFormElement>(
        `[name="${form}"]`
      ).style.display = 'none';
    });
};

const compatibleOnlineSystem = (system: BasicSystemInfo) => system.stateOfHealth === 'online' && parseFloat(system.version) >= 5.1;

if (urlParams.has('code')) {
  getToken()
    .then((response) => response.json())
    .then((data) => {
      cloudToken = data;
      show('endpoint-data');
      return data.access_token;
    })
    .then((accessToken) =>
      fetch(systemsEndpoint, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then((response) => response.json())
    )
    .then((systems: BasicSystemInfo[]) => {
      systemsInfo = systems;
      const systemOptions = systems.map(
        (system) =>
          `<option value="${system.id}" ${
            compatibleOnlineSystem(system) ? '' : 'disabled'
          }>${system.name}</option>`
      );
      systemSelect.innerHTML = systemOptions.join('');
      const defaultSystem =
        systems.find(compatibleOnlineSystem) ||
        systems[0];
      systemSelect.value = defaultSystem.id;
      const event = new Event('change');
      systemSelect.dispatchEvent(event);
    })
    .catch(() => show())
    .finally(() => {
      window.history.replaceState({}, document.title, window.location.pathname);
    });
} else {
  show();
}

document.querySelector<HTMLFormElement>('#description').innerHTML = description;

const endpointForm = document.querySelector<HTMLFormElement>(
  '[name="endpoint-data"]'
);
const instanceForm = document.querySelector<HTMLFormElement>(
  '[name="cloud-data"]'
);
const systemSelect = document.querySelector<HTMLSelectElement>(
  '[name="selectedSystem"]'
);
const cameraSelect = document.querySelector<HTMLSelectElement>(
  '[name="selectedCamera"]'
);

const positionSelect = document.querySelector<HTMLInputElement>(
  '[name="selectedPosition"]'
);

const playbackSpeedSelect = document.querySelector<HTMLSelectElement>(
  '[name="selectedSpeed"]'
);

const streamQualitySelect = document.querySelector<HTMLSelectElement>(
  '[name="streamQuality"]'
);

const videoElement = document.querySelector('video');
const currentStreamSpan = document.querySelector<HTMLSpanElement>('#currentStream');
const currentResolutionSpan = document.querySelector<HTMLSpanElement>('#currentResolution');

const clean = (id: string): string => id.replace('{', '').replace('}', '');

// Convert stream quality select value to AvailableStreams array
const getAvailableStreamsFromQuality = (quality: string): AvailableStreams[] => {
  switch (quality) {
    case 'high':
      return [AvailableStreams.PRIMARY];
    case 'low':
      return [AvailableStreams.SECONDARY];
    case 'auto':
    default:
      return [AvailableStreams.PRIMARY, AvailableStreams.SECONDARY];
  }
};

// Update current stream display
const updateCurrentStreamDisplay = (stream: AvailableStreams | null) => {
  if (stream === null) {
    currentStreamSpan.textContent = 'Not Started';
    currentStreamSpan.style.color = '#999';
  } else if (stream === AvailableStreams.PRIMARY) {
    currentStreamSpan.textContent = 'Stream 0 (High Quality)';
    currentStreamSpan.style.color = '#4CAF50';
  } else if (stream === AvailableStreams.SECONDARY) {
    currentStreamSpan.textContent = 'Stream 1 (Low Quality)';
    currentStreamSpan.style.color = '#2196F3';
  }
};

let currentInstance: WebRTCStreamManager;
let currentPositionSubscription: Subscription;
let resolutionUpdateHandler: (() => void) | null = null;

const setTimestamp = (timestamp = -1) => {
  const timestampElement = document.getElementById('timestamp');
  if (timestamp > 0) {
    timestampElement.parentElement.style.display = 'inline';
    timestampElement.innerText = `${timestamp} - ${new Date(timestamp / 1000)}`
  } else {
    timestampElement.parentElement.style.display = 'none';
  }
}

setTimestamp();

const startStream = (systemId: string, cameraId: string, serverId: string, allowTranscoding = false) => {
  newStream$.next();
  WebRTCStreamManager.closeAll();
  const version = parseFloat(systemsInfo.find(({ id }) => id === systemSelect.value ).version);
  const webRtcUrlConfig = {
    accessToken: () => systemToken.access_token,
    allowTranscoding,
    systemId,
    cameraId,
    targetStream: TargetStream.AUTO,
    position: parseFloat(positionSelect.value),
    speed: playbackSpeedSelect.value === 'unlimited' ?  (version >= 6 ? 'unlimited' as const : 100) : parseFloat(playbackSpeedSelect.value),
  };
  currentInstance = null;
  setTimestamp();
  updateCurrentStreamDisplay(null);

  // Reset resolution display
  currentResolutionSpan.textContent = '-';
  currentResolutionSpan.style.color = '#999';

  // Enable stop button when stream starts
  const stopBtn = document.querySelector<HTMLButtonElement>('#stopStreamBtn');
  if (stopBtn) stopBtn.disabled = false;

  WebRTCStreamManager.connect(webRtcUrlConfig, videoElement)
    .pipe(takeUntil(newStream$))
    .subscribe(([stream, error, instance]) => {
      if (!currentInstance && instance) {
        currentInstance = instance;

        // Subscribe to position updates if available
        currentPositionSubscription?.unsubscribe();
        if (instance.currentPosition$) {
          currentPositionSubscription = instance.currentPosition$.pipe(takeUntil(newStream$)).subscribe(setTimestamp);
        }

        // Set initial available streams based on quality selector
        const availableStreams = getAvailableStreamsFromQuality(streamQualitySelect.value);
        console.log('🎬 Setting initial available streams:', availableStreams);
        instance.updateAvailableStreams(availableStreams);
      }
      if (stream) {
        videoElement.srcObject = stream;
        videoElement.muted = true;
        videoElement.autoplay = true;

        document.querySelector('h2').style.display = WebRTCStreamManager.getInstance({id: cameraId, systemId })?.allowTranscoding ? 'block' : 'none';

        // Update display with actual current stream from WebRTCStreamManager
        if (currentInstance) {
          const actualCurrentStream = currentInstance.currentStream();
          console.log('📺 Initial stream from WebRTCStreamManager:', actualCurrentStream === AvailableStreams.PRIMARY ? 'Stream 0 (High)' : 'Stream 1 (Low)');
          updateCurrentStreamDisplay(actualCurrentStream);

          // Remove old event listeners if they exist
          if (resolutionUpdateHandler) {
            videoElement.removeEventListener('loadedmetadata', resolutionUpdateHandler);
            videoElement.removeEventListener('resize', resolutionUpdateHandler);
          }

          // Update resolution display when video metadata loads
          resolutionUpdateHandler = () => {
            if (videoElement.videoWidth && videoElement.videoHeight) {
              currentResolutionSpan.textContent = `${videoElement.videoWidth}x${videoElement.videoHeight}`;
              currentResolutionSpan.style.color = '#FF9800';
              console.log('📐 Resolution updated:', `${videoElement.videoWidth}x${videoElement.videoHeight}`);
            }
          };

          // Set initial resolution display if already available
          resolutionUpdateHandler();

          // Listen for metadata load to update resolution
          videoElement.addEventListener('loadedmetadata', resolutionUpdateHandler);

          // Also listen for resize events (for stream quality changes)
          videoElement.addEventListener('resize', resolutionUpdateHandler);
        }
      }

      if (error) {

        if (error === 'transcodingDisabled') {
          if (confirm('Transcoding is disabled. Do you want to enable it?')) {
            startStream(systemId, cameraId, serverId, true);
          }
        } else if(error === 'invalidAccessToken') {
          getSystemToken(systemSelect.value).then(tokenInfo => {
            systemToken = tokenInfo
            startStream(systemId, cameraId, serverId)
          });
        } else {
          alert(`Error playing back stream: ${error}}`);
        }

      }
    });
}

const startStreamHandler = async (event?: SubmitEvent) => {
  event?.preventDefault();
  newStream$.next();

  const data = new FormData(endpointForm);
  const selectedCamera = clean(data.get('selectedCamera') as string);
  const targetServer = clean(
    cameras.find((camera) => clean(camera.id) === selectedCamera).serverId
  );

  startStream(systemId, selectedCamera, targetServer)
};

const redirectOauth = (event: SubmitEvent) => {
  event.preventDefault();
  const cloudInstance = new FormData(instanceForm).get('cloudInstance');
  window.localStorage.setItem('cloudInstance', cloudInstance as string);
  const authorizationUrl = `${cloudInstance}/authorize?redirect_uri=${window.location.href}`;
  window.location.href = authorizationUrl;
};

const getSystemToken = (systemId: string): Promise<TokenInfo> => {
  const payload = {
    client_id: 'cloud',
    grant_type: 'refresh_token',
    response_type: 'token',
    refresh_token: cloudToken.refresh_token,
    scope: `cloudSystemId=${systemId}`,
  };

  return getToken(payload).then((response) => response.json());
};

const systemSelected = async () => {
  document.querySelector<HTMLDivElement>('#selectedCamera').style.display =
    'block';
  cameraSelect.innerHTML =
    '<option value="loading">Loading Cameras...</option>';
  const defaultTrafficHRelayHost = '{systemId}.relay.vmsproxy.com';
  // @ts-expect-error
  const trafficRelayHost = await fetch(`${import.meta.env.PROD ? '/.netlify/functions/proxy?url=': 'http://localhost:4242/'}${cloudInstance}/api/utils/settings`)
    .then((response) => response.json())
    .then(({ trafficRelayHost }) => trafficRelayHost)
    .catch(() =>
      prompt(
        'Unable to fetch traffic relay host from cloud portal. Please enter relay url:',
        defaultTrafficHRelayHost
      )
    );
  WebRTCStreamManager.RELAY_URL = trafficRelayHost;
  systemRelay = `${trafficRelayHost.replace('{systemId}', systemSelect.value)}`;
  systemId = systemSelect.value;
  systemToken = await getSystemToken(systemSelect.value);

  cameras = await fetchWithRedirectAuthorization(`https://${systemRelay}/rest/v2/devices`, {
    headers: { Authorization: `Bearer ${systemToken.access_token}` },
  }).then((res) => res.json());

  const cameraAvailable = (camera: BasicCameraInfo) => true;
  const camerasOptions = cameras.sort((a, b) => a.name.localeCompare(b.name)).map(
    (camera) =>
      `<option value="${camera.id}" ${
        cameraAvailable(camera) ? '' : 'disabled'
      }>${camera.name}</option>`
  );
  cameraSelect.innerHTML = camerasOptions.join('');
  const defaultCamera =
    cameras.find(cameraAvailable) ||
    cameras[0];
  cameraSelect.value = defaultCamera.id;
  const event = new Event('change');
  cameraSelect.dispatchEvent(event);
};

const cameraSelected = () => {
  document.querySelector<HTMLButtonElement>(
    '[name="endpoint-data"] button'
  ).disabled = false;
};

const toggleSpeedSelectorDisabled = () => {
  if (positionSelect.value === '0') {
    playbackSpeedSelect.disabled = true;
  } else {
    playbackSpeedSelect.disabled = false;
  }
};

const changeSpeedHandler = () => {
  if (currentInstance?.apiVersion === ApiVersions.v2) {
    return currentInstance.updateSpeed(playbackSpeedSelect.value === 'unlimited' ? Infinity : parseFloat(playbackSpeedSelect.value))
  }
  return startStreamHandler()
}

// Handle stream quality changes - dynamically update available streams on running instance
const changeStreamQualityHandler = () => {
  if (!currentInstance) {
    console.log('ℹ️ No active stream instance - quality will apply when stream starts');
    return;
  }

  const selectedQuality = streamQualitySelect.value;
  const availableStreams = getAvailableStreamsFromQuality(selectedQuality);

  console.log(`🔄 Switching stream quality to: ${selectedQuality}`, {
    availableStreams,
    currentStream: currentInstance.currentStream(),
    peerConnection: currentInstance['peerConnection'],
    datachannel: currentInstance['peerConnection']?.remoteDataChannel,
    datachannelState: currentInstance['peerConnection']?.remoteDataChannel?.readyState,
    apiVersion: currentInstance['apiVersion']
  });

  // Update available streams on the running instance
  // This will trigger seamless stream switching if needed
  currentInstance.updateAvailableStreams(availableStreams);
};

instanceForm.addEventListener('submit', redirectOauth);
systemSelect.addEventListener('change', systemSelected);
cameraSelect.addEventListener('change', cameraSelected);
positionSelect.addEventListener('change', toggleSpeedSelectorDisabled);

endpointForm.addEventListener('submit', startStreamHandler);
playbackSpeedSelect.addEventListener('change', changeSpeedHandler);
streamQualitySelect.addEventListener('change', changeStreamQualityHandler);

// Stop & Cleanup Button
const stopStreamBtn = document.querySelector<HTMLButtonElement>('#stopStreamBtn');
const forceGCBtn = document.querySelector<HTMLButtonElement>('#forceGCBtn');
const memoryInfoSpan = document.querySelector<HTMLSpanElement>('#memoryInfo');

const stopAndCleanup = () => {
  console.log('🛑 Stopping and cleaning up all WebRTC resources...');

  // 1. Signal new stream to trigger takeUntil cleanup
  newStream$.next();

  // 2. Unsubscribe from all subscriptions
  currentPositionSubscription?.unsubscribe();
  currentPositionSubscription = null;

  // 2.1 Remove event listeners
  if (resolutionUpdateHandler) {
    videoElement.removeEventListener('loadedmetadata', resolutionUpdateHandler);
    videoElement.removeEventListener('resize', resolutionUpdateHandler);
    resolutionUpdateHandler = null;
  }

  // 3. Stop all MediaStream tracks explicitly
  if (videoElement.srcObject) {
    const stream = videoElement.srcObject as MediaStream;
    stream.getTracks().forEach(track => {
      console.log(`  ⏹️  Stopping track: ${track.kind} (${track.id})`);
      track.stop();
    });
    videoElement.srcObject = null;
  }

  // 4. Close all WebRTC connections
  WebRTCStreamManager.closeAll();
  currentInstance = null;

  // DEFENSIVE FIX: Remove any orphaned video elements from body
  // This is a safety net in case WebRTCStreamManager cleanup doesn't catch everything
  // Only removes elements that are NOT the main #targetVideo element
  const orphanVideos = document.querySelectorAll<HTMLVideoElement>('body > video');
  let removedCount = 0;

  orphanVideos.forEach(video => {
    // Skip the main video element used for display
    if (video.id !== 'targetVideo') {
      console.warn('  ⚠️  Removing orphaned video element:', {
        id: video.id || '(no id)',
        className: video.className || '(no class)',
        dimensions: `${video.clientWidth}x${video.clientHeight}`,
        parent: video.parentElement?.tagName
      });

      // Clean up the video element
      video.srcObject = null;
      video.load();
      video.remove();
      removedCount++;
    }
  });

  if (removedCount > 0) {
    console.log(`  ✅ Removed ${removedCount} orphaned video element(s)`);
  }

  // 5. Reset UI
  setTimestamp();
  updateCurrentStreamDisplay(null);

  // Reset resolution display
  currentResolutionSpan.textContent = '-';
  currentResolutionSpan.style.color = '#999';

  stopStreamBtn.disabled = true;

  console.log('✅ Cleanup complete');
};

stopStreamBtn.addEventListener('click', stopAndCleanup);

forceGCBtn.addEventListener('click', () => {
  if ((window as any).gc) {
    console.log('🗑️  Forcing garbage collection...');
    (window as any).gc();
    console.log('✅ GC complete');
  } else {
    alert('GC not available. Run Chrome with --js-flags="--expose-gc"');
  }
});

// Memory monitoring (if performance.memory is available)
if ((performance as any).memory) {
  setInterval(() => {
    const mem = (performance as any).memory;
    const used = (mem.usedJSHeapSize / 1048576).toFixed(2);
    const total = (mem.totalJSHeapSize / 1048576).toFixed(2);
    const limit = (mem.jsHeapSizeLimit / 1048576).toFixed(2);
    memoryInfoSpan.textContent = `${used} / ${total} MB (Limit: ${limit} MB)`;
  }, 1000);
} else {
  memoryInfoSpan.textContent = 'Enable with --enable-precise-memory-info';
}
