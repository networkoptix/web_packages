type int = number;
type float = number;
type uuid = string;

interface BaseParams {
    description?: string;
    enabled: boolean;
}

interface ContrastParams extends BaseParams {
    blackLevel: float;
    whiteLevel: float;
    gamma: float;
}

interface DewarpingParams extends BaseParams {
    xAngle: int;
    yAngle: int;
    fov: int;
    panoFactor: 1 | 2 | 4;
}

export interface LayoutItem {
    id: uuid;
    flags: int;
    top: int;
    bottom: int;
    left: int;
    right: int;
    rotation: int;
    zoomLeft: float;
    zoomTop: float;
    zoomRight: float;
    zoomBottom: float;
    zoomTargetId: uuid;
    contrastParams: ContrastParams;
    dewarpingParams: DewarpingParams;
    displayInfo: boolean;
    controlPtz: boolean;
    displayAnalyticsObjects: boolean;
    displayRoi: boolean;
    resourceId: uuid;
    resourcePath: string;
    name?: string;
}

export type LayoutItems = LayoutItem[];

export interface Layout {
    backgroundHeight: int;
    backgroundImageFilename: string;
    backgroundOpacity: float;
    backgroundWidth: int;
    cellAspectRatio: float;
    cellSpacing: float;
    fixedHeight: int;
    fixedWidth: int;
    id: uuid;
    items: LayoutItems;
    locked: boolean;
    logicalId: int;
    name: string;
    systemId: uuid;
    parentId?: uuid;
}

export type Layouts = Layout[];

interface CameraId {
    cameraId: string;
}

interface Speed {
    speed: number;
}

export enum PtzCommands {
    RELATIVE_MOVE = 'RelativeMovePtzCommand',
    RELATIVE_FOCUS = 'RelativeFocusPtzCommand',
}

export interface BasePtzCommand<Command> extends CameraId {
    command: Command;
}

export interface Pan {
    pan: number;
}

export interface Tilt {
    tilt: number;
}

export interface Zoom {
    zoom: number;
}

export interface PtzMoveParams extends Speed, Pan, Tilt, Zoom {}

export interface Focus {
    focus: number;
}

export interface PtzMoveCommand extends BasePtzCommand<PtzCommands.RELATIVE_MOVE>, PtzMoveParams {}

export interface PtzFocusCommand extends BasePtzCommand<PtzCommands.RELATIVE_FOCUS>, Focus {}

export type PtzCommand = PtzMoveCommand | PtzFocusCommand;

export interface WebPage {
    id: uuid;
    parentId: uuid;
    name: string;
    url: string;
    typeId: uuid;
}

export type WebPages = WebPage[];
