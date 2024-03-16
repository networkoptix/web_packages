import * as THREE from 'three';

export const resetScene = (scene: THREE.Scene): void => {
    // eslint-disable-next-line prefer-spread
    scene.remove.apply(scene, scene.children);
    scene.background = new THREE.Color();
};
