import { debounce } from 'lodash-es';
import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';

import { DewarpingParamsLayoutItem } from '@services/system-api.types/layouts.types';
import { DewarpingParamsCapable } from '@services/system.service/camera-manager/camera-manager-types';

import { FisheyeViewerDewarpingParams, RenderStep } from '../../fisheye-viewer.types';
import { initializeCamera } from '../../utils/initialize-camera';
import { initializeMeshMaterial } from '../../utils/initialize-mesh-material';
import { initializeRenderer } from '../../utils/initialize-renderer';
import {
    azimuthToXAngle,
    fovToZoom,
    polarToYAngle,
    xAngleToAzimuth,
    yAngleToPolar,
    zoomToFov,
} from '../../utils/item-param-utils';
import { onPlaying } from '../../utils/on-playing';
import { resetScene } from '../../utils/reset-scene';

const defaultDewarpingParamsCamera: DewarpingParamsCapable = {
    cameraProjection: 'equisolid',
    enabled: true,
    fovRot: 0,
    hStretch: 1,
    radius: 0.5,
    sphereAlpha: 0,
    sphereBeta: 0,
    viewMode: 'ceiling',
    xCenter: 0.5,
    yCenter: 0.5,
} as const;

const defaultDewarpingParamsItem = {
    enabled: true,
    xAngle: 0,
    yAngle: 0,
    fov: 0,
    panoFactor: 1,
} as const;

export abstract class BaseRenderer {
    protected scene = new THREE.Scene();
    protected camera: THREE.PerspectiveCamera;
    protected renderer: THREE.WebGLRenderer | null;
    protected resizeObserver: ResizeObserver | null;
    protected controls: OrbitControls | null;
    protected material: THREE.ShaderMaterial;
    protected dewarpingParamsCustom: FisheyeViewerDewarpingParams | undefined;

    public end(target: HTMLElement): void {
        this.disposeRenderer(target);
        this.disposeControls();
        this.disposeResizeObserver();
        resetScene(this.scene);
    }

    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    public getRenderStepParams = () => ({
        camera: this.camera,
        scene: this.scene,
        material: this.material,
        dewarpingParams: this.dewarpingParamsCustom,
    });

    private registerResizeObserver(target: HTMLElement): void {
        this.disposeResizeObserver();

        this.resizeObserver = new ResizeObserver(
            ([
                {
                    contentRect: { width, height },
                },
            ]) => {
                this.camera.aspect = width / height;
                this.camera.updateProjectionMatrix();
                this.renderer?.setSize(width, height);
            },
        );

        this.resizeObserver.observe(target);
    }

    private disposeResizeObserver(): void {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
    }

    private registerRenderer(target: HTMLElement, width: number, height: number): void {
        this.disposeRenderer(target);

        this.renderer = initializeRenderer(width, height);
        target.appendChild(this.renderer.domElement);
    }

    private disposeRenderer(target: HTMLElement): void {
        if (this.renderer) {
            target.removeChild(this.renderer.domElement);
            this.renderer.dispose();
            this.renderer = null;
        }
    }

    private resetControls = (): void => {
        if (!this.controls) {
            return;
        }

        this.controls.minPolarAngle = 0;
        this.controls.maxPolarAngle = Math.PI;
        this.controls.enabled = true;
        this.controls.minAzimuthAngle = Infinity;
        this.controls.maxAzimuthAngle = -Infinity;
    };

    private setViewContraints = (constrainTo: number): void => {
        if (!this.controls) {
            return;
        }

        this.resetControls();

        switch (this.dewarpingParamsCustom?.dewarpingParamsCamera.viewMode) {
            case 'table':
                this.controls.minPolarAngle = Math.PI - constrainTo;
                break;
            case 'wall':
                const polarConstraint = Math.PI / 2 - constrainTo;
                const azimuthConstraint = (Math.PI - polarConstraint * 2) / 2;
                this.controls.minPolarAngle = polarConstraint;
                this.controls.maxPolarAngle = Math.PI - polarConstraint;
                this.controls.minAzimuthAngle = -azimuthConstraint;
                this.controls.maxAzimuthAngle = azimuthConstraint;
                break;
            default:
                this.controls.maxPolarAngle = constrainTo;
        }
    };

    private readonly initialFov = 25;

    public zoomTo = (fov: number): number => {
        if (!this.controls) {
            return this.camera.zoom;
        }

        const getProjectionBoundary = (): number => {
            const fov = this.camera.fov;

            if (fov < 15) {
                return 1.35;
            }

            if (fov < 20) {
                return 1.45;
            }

            if (fov < 25) {
                return 1.55;
            }

            if (fov < 35) {
                return 1.65;
            }

            return 1.75;
        };

        const defaultRotationSpeed = -0.073;
        this.camera.fov = fov;
        const projectionBoundary = getProjectionBoundary();
        const fovRadians = (this.camera.fov * (Math.PI / 180)) / projectionBoundary;
        this.setViewContraints(Math.PI / 2 - fovRadians);
        this.controls.rotateSpeed = defaultRotationSpeed / (this.initialFov / fov);
        this.controls.update();
        this.camera.updateProjectionMatrix();

        return this.initialFov / this.camera.fov;
    };

    public zoomBy = (zoomFactor = 1.1): number => {
        const currentZoom = this.initialFov / this.camera.fov;
        return this.zoomTo(currentZoom * zoomFactor);
    };

    public setAzimuthalAngle = (azimuthalAngle: number): void => {
        if (!this.controls) {
            return;
        }

        this.controls.setAzimuthalAngle(
            xAngleToAzimuth(
                this.dewarpingParamsCustom!.dewarpingParamsCamera.viewMode,
                azimuthalAngle,
            ),
        );
    };

    public setPolarAngle = (polarAngle: number): void => {
        if (!this.controls) {
            return;
        }

        this.controls.setPolarAngle(
            yAngleToPolar(
                this.dewarpingParamsCustom!.dewarpingParamsCamera.viewMode,
                polarAngle,
                this.controls.maxPolarAngle,
                this.camera.fov,
            ),
        );
    };

    /**
     * Override this method to handle controls updates
     */
    public controlsUpdatesHandler = (
        itemParams: Pick<DewarpingParamsLayoutItem, 'xAngle' | 'yAngle' | 'fov'>,
    ): void => {
        console.info('updateControls', itemParams);
    };

    private updateControls = debounce(() => {
        if (this.controls) {
            const viewMode =
                this.dewarpingParamsCustom?.dewarpingParamsCamera.viewMode || 'ceiling';
            const fov = zoomToFov(this.camera.fov);
            const azimuthalAngle = this.controls.getAzimuthalAngle();
            const xAngle = azimuthToXAngle(viewMode, azimuthalAngle);
            const yAngle = polarToYAngle(
                viewMode,
                this.controls.getPolarAngle(),
                this.controls.maxPolarAngle,
                fov,
            );

            this.controlsUpdatesHandler({
                xAngle,
                yAngle,
                fov,
            });
        }
    }, 250);

    private registerControls(): void {
        this.disposeControls();

        this.controls = new OrbitControls(this.camera, this.renderer!.domElement);
        this.controls.enableZoom = true;
        this.controls.enablePan = false;
        this.controls.enableRotate = true;

        this.controls.update();

        this.zoomTo(fovToZoom(this.dewarpingParamsCustom?.dewarpingParamsItem.fov || 1));

        setTimeout(() => {
            this.setAzimuthalAngle(this.dewarpingParamsCustom!.dewarpingParamsItem.xAngle);
            this.setPolarAngle(this.dewarpingParamsCustom!.dewarpingParamsItem.yAngle);
            if (this.controls) {
                this.controls.removeEventListener('change', this.updateControls);
                this.controls.addEventListener('change', this.updateControls);
            }
        }, 0);
    }

    private disposeControls(): void {
        if (this.controls) {
            this.controls.dispose();
            this.controls = null;
        }
    }

    private registerMaterial(source: HTMLVideoElement): void {
        this.disposeMaterial();

        if (!this.dewarpingParamsCustom?.dewarpingParamsCamera) {
            return;
        }
        const { material, cleanUp } = initializeMeshMaterial(
            source,
            this.dewarpingParamsCustom.dewarpingParamsCamera,
        );
        this.disposeMaterial = cleanUp;
        this.material = material;
    }

    private disposeMaterial(): void {}

    protected initialize(
        source: HTMLVideoElement,
        target: HTMLElement,
        dewarpingParams?: FisheyeViewerDewarpingParams,
    ): void {
        const { dewarpingParamsCamera, dewarpingParamsItem } =
            dewarpingParams || ({} as FisheyeViewerDewarpingParams);
        this.dewarpingParamsCustom = {
            dewarpingParamsCamera: { ...defaultDewarpingParamsCamera, ...dewarpingParamsCamera },
            dewarpingParamsItem: { ...defaultDewarpingParamsItem, ...dewarpingParamsItem },
        };

        const { width, height } = target.getBoundingClientRect();
        this.camera = initializeCamera(this.initialFov);
        this.registerMaterial(source);

        resetScene(this.scene);

        this.registerRenderer(target, width, height);
        this.registerControls();
        this.registerResizeObserver(target);
    }

    protected abstract renderSteps: RenderStep[];

    private renderScene(): void {
        this.renderSteps.forEach(step => step(this.getRenderStepParams));
    }

    public async start(
        source: HTMLVideoElement,
        target: HTMLElement,
        dewarpingParams?: FisheyeViewerDewarpingParams,
    ): Promise<void> {
        await onPlaying(source);

        this.initialize(source, target, dewarpingParams);

        this.renderScene();

        this.animate();
    }

    private animate(): void {
        if (!this.renderer) {
            return;
        }

        requestAnimationFrame(() => this.animate());
        this.renderer.render(this.scene, this.camera);
    }
}
