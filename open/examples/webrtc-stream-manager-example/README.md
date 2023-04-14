![Nx Meta Logo](https://meta.nxvms.com/static/images/logo.png)

# WebRTC Stream Manager Example ![License: MPL--2.0"](https://img.shields.io/badge/License-MPL--2.0-yellow.svg)

This a minimal example of how to use the `@networkoptix/webrtc-stream-manager` package to integrate streaming from an Nx Meta VMS server to your own integrations.

For full documentation on the `@networkoptix/webrtc-stream-manager` package [view the readme](../../packages/webrtc-stream-manager/README.md).

---

## How to start the demo

### Install workspace dependencies

From the root folder run `npm install`. This will install shared workspace dependencies and link local packages.

```sh
npm install
```

### Run demo

Running `npm start` will start running the demo.

```sh
npm start
```

### Open demo page

Open [http://127.0.0.1:5173](http://127.0.0.1:5173).

Enter the `server_url`, `camera_id`, and `auth` then click the `Start WebRTC Connection` button to start playing live stream from a camera.

---

## Demo Source code

The relevant part of the source code related to the `@networkoptix/webrtc-stream-manager` package is in `startStream` function in the [main.ts](./src/main.ts) file.

We pass in the `webRtcUrlFactory` and `videoElement` into the `WebRTCStreamManager.connect` static method.

Then we subscribe to the returned observable and handle the `stream` or `error` that is emitted.

In this demo we're just setting the srcObject to the stream.

```typescript
const startStream = (event: SubmitEvent) => {
  event.preventDefault()

  const data = new FormData(form);

  const webRtcUrlFactory = () => `wss://${data.get('endpoint')}/webrtc-tracker?camera_id=${data.get('cameraId')}&auth=${data.get('auth')}`

  WebRTCStreamManager.connect(webRtcUrlFactory, videoElement).subscribe(([stream, error]) => {
    if (stream) {
      videoElement.srcObject = stream;
      videoElement.muted = true;
      videoElement.autoplay = true;
    }

    if (error) {
      alert('Error playing back stream')
    }
  })
}
```
