// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import './style.css'
import { WebRTCStreamManager } from '@networkoptix/webrtc-stream-manager'

import { description } from '../package.json'

document.querySelector<HTMLFormElement>('#description').innerHTML = description;

const form = document.querySelector<HTMLFormElement>('[name="endpoint"]')
const videoElement = document.querySelector('video')

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

form.addEventListener('submit', startStream)