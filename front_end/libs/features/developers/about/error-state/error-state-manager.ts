import type { AboutNode } from '../about.component.types';

export interface AssetBlock {
    type: string;
    contentHTML: string;
    content: string;
}

export interface ErrorStateStructure {
    [key: string]: boolean | string | number | AssetBlock | ErrorStateStructure;
}

type AboutNodeFields =
    | 'assetId'
    | 'displayName'
    | 'icon'
    | 'newWindow'
    | 'title'
    | 'url'
    | 'shortDescription'
    | 'blocks'
    | 'asset'
    | 'nodes'
    | 'subtitle';

type BaseErrorConfig = {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    [key in AboutNodeFields]: string | ErrorConfig;
};

interface ErrorConfig extends Partial<BaseErrorConfig> {
    nodes?: ErrorConfig;
    asset?: ErrorConfig;
}

export class ErrorStateManager {
    private _errors: ErrorStateStructure = {};

    get hasErrors() {
        return !!Object.entries(this._errors).length;
    }

    get errors() {
        return this._errors;
    }

    set errors(value) {
        if (value.name && window) {
            const message = `Section ${value.name} contains errors`;
            window.parent.postMessage(message, '*');
        }
        this._errors = { ...this._errors, ...value };
    }

    /**
     * Updates the instances errors property by checking the aboutNode against the errorConfig
     *
     * @param aboutNode - menu node structure from CMS, could probably be modified to use on nodes other than about menu
     * @param errorConfig - config returned from buildConfig method
     */
    checkAboutNode(aboutNode: AboutNode, errorConfig: ErrorConfig) {
        const parsedAbout = this.parseAbout(aboutNode);
        this.errors = this.buildError(parsedAbout, errorConfig);
        return this.errors;
    }

    /**
     * Parses the aboutNode to an ErrorStateStructure object that is used by the ErrorStateManager.
     *
     * @param param0 - Accepts an AboutNode, and probably can accept any menu node
     */
    parseAbout = ({ nodes, ...node }: AboutNode): ErrorStateStructure => ({
        ...node,
        nodes: nodes?.reduce(
            (reduced, current, index) => ({ ...reduced, [index]: this.parseAbout(current) }),
            {},
        ),
    });

    /**
     * Builds the ErrorConfig used by checkAboutNode method.
     *
     * @param requiredFields - Accepts an array of strings to list the required fields.
     * @param nodesConfig - Accepts either and ErrorConfig which is used againsts all nodes or an an ErrorConfig[] if each node has its own config.
     * @param assetConfig - Accepts an ErrorConfig which is used to check the asset.
     */
    buildConfig(
        requiredFields: AboutNodeFields[],
        nodesConfig?: ErrorConfig | ErrorConfig[],
        assetConfig?: ErrorConfig,
    ): ErrorConfig {
        const config = requiredFields.reduce(
            (config, cur) => ({
                ...config,
                [cur]: true,
            }),
            {} as ErrorConfig,
        );

        if (nodesConfig) {
            config.nodes = (Array.isArray(nodesConfig) ? nodesConfig : [nodesConfig]).reduce(
                (nodes, node, index) => ({
                    ...nodes,
                    [index]: node,
                }),
                {} as ErrorConfig,
            );
        }

        if (assetConfig) {
            config.asset = assetConfig;
        }

        return config;
    }

    /**
     * This takes the ErrorStateStructure, removes properties that were validated against the ErrorConfig.
     * The returned ErrorStateStructure contains only properties that didn't pass validation.
     *
     * @param node - Accepts an ErrorStateStructure object
     * @param config - Accepts an ErrorConfig object
     */
    buildError(node: ErrorStateStructure, config: ErrorConfig) {
        const { nodes: nodesStructure, asset: assetStructure, ...partialStructure } = node;
        const { nodes: nodesConfig, asset: assetConfig, ...partialConfig } = config;

        const errors = Object.keys(partialConfig).reduce(
            (errors, key) =>
                !partialStructure[key]
                    ? {
                          ...errors,
                          [key]: `Value for the "${key}" field is missing and is required to for this section.`,
                      }
                    : errors,
            {} as ErrorStateStructure,
        );

        if (nodesConfig) {
            const nodesErrors = !nodesStructure
                ? 'Nodes are missing but are required for this section'
                : Object.entries(nodesStructure).reduce(
                      (nodes, [key, nodeStructure]: [string, ErrorStateStructure]) => {
                          const nodeConfig = nodesConfig[key] || nodesConfig[0];
                          const nodeError = this.buildError(nodeStructure, nodeConfig);

                          return Object.entries(nodeError).length
                              ? {
                                    ...nodes,
                                    [nodesStructure[key].title]: this.buildError(
                                        nodeStructure,
                                        nodeConfig,
                                    ),
                                }
                              : nodes;
                      },
                      {} as ErrorStateStructure,
                  );

            if (Object.entries(nodesErrors).length) {
                errors.nodes = nodesErrors;
            } else if (!Object.entries(nodesStructure)) {
                errors.nodes = 'Nodes missing';
            }
        }

        if (assetConfig && !assetStructure) {
            errors.asset = 'Asset are missing but are required for this section';
        }
        if (assetConfig && assetStructure) {
            const assetErrors = Object.keys(assetConfig).reduce(
                (errors, key) =>
                    !assetStructure[key]
                        ? {
                              ...errors,
                              [key]: `Value for the "${key}" field is missing and is required to for this section.`,
                          }
                        : errors,
                {} as ErrorStateStructure,
            );
            if (Object.keys(assetErrors).length > 0) {
                errors.asset = assetErrors;
            }
        }

        if (Object.entries(errors).length) {
            errors.name = node.title;
        }
        return errors;
    }
}
