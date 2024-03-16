import * as THREE from 'three';

import { RenderStep } from '../fisheye-viewer.types';

// eslint-disable-next-line nx/no-untyped-arg
export const renderFisheye: RenderStep = getRenderStepParams => {
    const { camera, scene, material, dewarpingParams } = getRenderStepParams();
    const geometry = new THREE.SphereGeometry(90);
    geometry.scale(-1, 1, 1);

    const mesh = new THREE.Mesh(geometry, material);
    const viewMode = dewarpingParams?.dewarpingParamsCamera.viewMode || 'ceiling';

    const yPositions: Record<typeof viewMode, number> = {
        ceiling: 15,
        table: -15,
        wall: 0,
    };

    mesh.position.set(0, yPositions[viewMode], 0);
    mesh.lookAt(camera.position);
    scene.add(mesh);
};
