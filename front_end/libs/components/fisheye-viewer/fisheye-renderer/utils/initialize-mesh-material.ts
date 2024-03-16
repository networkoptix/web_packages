import * as THREE from 'three';

import { DewarpingParamsCapable } from '@services/system.service/camera-manager/camera-manager-types';

type HTMLVideoElementWithCaptureStream = HTMLVideoElement & { captureStream: () => MediaStream };

const cropVideo = (
    source: HTMLVideoElement,
    dewarpingParams: DewarpingParamsCapable,
): {
    video: HTMLVideoElementWithCaptureStream;
    cleanUp: () => void;
} => {
    const canvas = document.createElement('canvas');

    let currentSourceWidth: number;
    let currentSourceHeight: number;
    let canceled = false;

    const startHandlingStream = (): void => {
        currentSourceWidth = source.videoWidth;
        currentSourceHeight = source.videoHeight;
        canvas.height = source.videoHeight / ((dewarpingParams?.yCenter || 0.5) * 2);
        canvas.width = canvas.height * (dewarpingParams?.hStretch || 1);
        const startX = canvas.width * (dewarpingParams?.xCenter || 0.5) - canvas.width / 2;
        const startY = canvas.height * (dewarpingParams?.yCenter || 0.5) - canvas.height / 2;
        const drawParams = [0, 0, currentSourceWidth, currentSourceHeight] as const;
        const cropParams = [startX, startY, canvas.width, canvas.height] as const;
        const drawImageParams = [...drawParams, ...cropParams] as const;
        const sourceCtx = canvas.getContext('2d');

        if (sourceCtx && dewarpingParams.viewMode === 'wall') {
            sourceCtx?.translate(currentSourceHeight, 0);
            sourceCtx?.scale(-1, 1);
        }

        const updateFrame = (now?: number, metadata?: { mediaTime: number }): void => {
            if (canceled) {
                return;
            }

            if (
                currentSourceWidth !== source.videoWidth ||
                currentSourceHeight !== source.videoHeight
            ) {
                return startHandlingStream();
            }

            if (metadata?.mediaTime) {
                sourceCtx?.drawImage(source, ...drawImageParams);
            }

            source.requestVideoFrameCallback(updateFrame);
        };

        updateFrame();
    };

    startHandlingStream();

    const newStream = canvas.captureStream();
    (source as HTMLVideoElementWithCaptureStream)
        .captureStream()
        .getAudioTracks()
        .forEach(track => newStream.addTrack(track));
    const video = document.createElement('video') as HTMLVideoElementWithCaptureStream;
    video.style.position = 'absolute';
    video.style.top = '0';
    video.style.left = '0';
    video.style.width = `${canvas.width}px`;
    video.style.height = `${canvas.height}px`;
    video.style.zIndex = '-10000000';
    source.parentElement?.appendChild(video);
    video.srcObject = newStream;
    video.autoplay = true;
    video.muted = true;
    return {
        video,
        cleanUp: () => {
            canceled = true;
            video.srcObject = null;
            video.remove();
        },
    };
};

const vertexShader = `
varying vec3 vNormal;

void main() {

    vNormal = normal;

    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

}
`;
const fragmentShader = `
uniform sampler2D tex;

varying vec3 vNormal;

void main() {

    vec2 uv = normalize( vNormal ).xy * 0.5 + 0.5;
    uv.x = 1.0 - uv.x;

    vec3 color = texture2D( tex, uv ).rgb;

    gl_FragColor = vec4( color, 1.0 );

}
`;
export const initializeMeshMaterial = (
    source: HTMLVideoElement,
    dewarpingParams: DewarpingParamsCapable,
): {
    material: THREE.ShaderMaterial;
    cleanUp: () => void;
} => {
    const { video, cleanUp } = cropVideo(source, dewarpingParams);
    const videoTexture = new THREE.VideoTexture(video);
    videoTexture.magFilter = THREE.NearestFilter;
    videoTexture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.ShaderMaterial({
        uniforms: {
            tex: { value: videoTexture },
        },
        vertexShader,
        fragmentShader,
    });
    return {
        material,
        cleanUp: () => {
            cleanUp();
            videoTexture.dispose();
        },
    };
};
