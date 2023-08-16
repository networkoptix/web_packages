// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import './style.css';

import { description } from '../package.json';
import { Subject, takeUntil } from 'rxjs';
import { WebRTCStreamManager, generateWebRtcUrlFactory } from './open_check_excluded';

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
const videoElement = document.querySelector('video');

const clean = (id: string): string => id.replace('{', '').replace('}', '');

const startStream = (relayUrl: string, cameraId: string, serverId: string) => {
  const version = parseFloat(systemsInfo.find(({ id }) => id === systemSelect.value ).version);

WebRTCStreamManager.connect(generateWebRtcUrlFactory(relayUrl, cameraId, serverId, version), videoElement)
  .pipe(takeUntil(newStream$))
  .subscribe(([stream, error]) => {
    if (stream) {
      if (typeof stream === 'string') {
        videoElement.src = stream;
      } else {
        videoElement.srcObject = stream;
      }
      videoElement.muted = true;
      videoElement.autoplay = true;
    }

    if (error) {
      alert('Error playing back stream');
    }
  });
}

const startStreamHandler = async (event: SubmitEvent) => {
  event.preventDefault();
  newStream$.next();

  const data = new FormData(endpointForm);
  const selectedCamera = clean(data.get('selectedCamera') as string);
  const targetServer = clean(
    cameras.find((camera) => clean(camera.id) === selectedCamera).serverId
  );

  startStream(systemRelay, selectedCamera, targetServer)
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
  systemRelay = `${trafficRelayHost.replace('{systemId}', systemSelect.value)}`;
  systemToken = await getSystemToken(systemSelect.value);

  await fetch(
    `https://${systemRelay}/rest/v2/login/sessions/${systemToken.access_token}?setCookie=true`,
    { credentials: 'include' }
  );

  cameras = await fetch(`https://${systemRelay}/rest/v2/devices`, { credentials: 'include' }).then((res) => res.json());

  const cameraAvailable = (camera: BasicCameraInfo) => ['online', 'recording'].includes(camera.status?.toLowerCase())
  const camerasOptions = cameras.map(
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

instanceForm.addEventListener('submit', redirectOauth);
systemSelect.addEventListener('change', systemSelected);
cameraSelect.addEventListener('change', cameraSelected);

endpointForm.addEventListener('submit', startStreamHandler);
