export enum AboutTemplates {
    INTRO = 'intro',
    CAPABILITIES = 'capabilities',
    DEV_CAPABILITIES = 'devCapabilities',
    SUPPORTED_TECH = 'supportedTech',
    GET_STARTED = 'getStarted',
    DEV_TOOLS = 'devTools',
    INTEGRATIONS = 'integrations',
    SUPPORT = 'support',
}

export interface AboutNode {
    title: string;
    subtitle: string;
    displayName: string;
    assetId: number;
    asset: any;
    url: string;
    icon: string;
    newWindow?: boolean;
    nodes?: AboutNode[];

    aniIcon?: string;
    currentIcon?: string;
}

export type AboutStructureNode = { template: AboutTemplates; node: AboutNode };

export type AboutStructure = AboutStructureNode[];

// interface AboutAssetBlock {
//   title: string;
//   titleHTML: string;
//   content: string;
//   contentHTML: string;
// }

// interface AboutAsset {
//   title: string;
//   shortDescription: string;
//   blocks: AboutAssetBlock;
// }
