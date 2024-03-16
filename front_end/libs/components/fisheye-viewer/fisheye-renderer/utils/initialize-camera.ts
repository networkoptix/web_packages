import * as THREE from 'three';

export const initializeCamera = (initialFov: number): THREE.PerspectiveCamera => {
    const camera = new THREE.PerspectiveCamera(initialFov, 1, 0.1, 100);
    camera.position.z = 0.01;
    return camera;
};
