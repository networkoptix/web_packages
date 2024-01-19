import { Type } from 'ng-mocks';

import { testBedSetupFactory } from './test_bed_setup_factory';

export const setupInjectableTestBed = async <T>(
    TargetService?: Type<T>,
    additionalImports: unknown[] = [],
    additionalProviders: unknown[] = [],
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
) => {
    const {
        inject,
        component: _,
        ...rest
    } = await testBedSetupFactory(additionalImports, additionalProviders)();
    const service = inject<T>(TargetService);
    return {
        service,
        ...rest,
    };
};
