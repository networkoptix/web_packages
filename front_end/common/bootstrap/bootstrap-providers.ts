interface Bootstrapable {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bootstrap(): Promise<any>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const bootstrapProviders = (...providers: Bootstrapable[]): Promise<any> =>
    Promise.allSettled(providers.map(provider => provider.bootstrap())).then(providerResults =>
        providerResults.map(res => res.status === 'fulfilled' && res.value).filter(val => !!val),
    );
