# Test Bed Setup
[&#8592; back to unit testing documentation](readme.md)

## Simple Component Setup

For most standalone components we can use the `setupComponent` function configured within the
[libs/components/src/setup.ts](../../../front_end/libs/components/src/setup.ts) file.

```typescript
import { setupComponent } from '@components/src/setup';

import { ComponentUnderTest } from './component-under-test.component';

describe('ComponentUnderTest', () => {
    it('should create the component', async () => {
        const { debugElement } = await setupComponent(ComponentUnderTest);
        expect(debugElement.nativeElement).toBeDefined();
    });
});
```

### Common issues with single component setup

There are some cases where the `setupComponent` function won't work. This is generally due to the
component being dependent on other services or injectable being missing from either the components
imports or providers.

For standalone components the dependencies should be fixed for that component. For example if the
component is dependent on a service that service should be added to the components providers.

For non-standalone components that we expect to be part of module that contains the required imports
and providers we'll either need to convert to a standalone component we'll need to provide them
ourselves within the test bed using the [advanced test bed setup](#advanced-test-bed-setup).

## Simple Injectable Setup

For simple services and other injectable we can use the
[setupInjectableTestBed](../../../front_end/test_utils/test_bed_setup_injectable.ts) function.

If the injectable is dependent on other services or injectable we'll need to provide them ourselves
within the test bed using the [advanced test bed setup](#advanced-test-bed-setup).

```typescript
import { setupInjectableTestBed } from 'test_utils/test_bed_setup_injectable';

import { ServiceUnderTest } from './service-under-test.service';

describe('ServiceUnderTest', () => {
    it('should create the service', async () => {
        const { service } = await  setupInjectableTestBed(ServiceUnderTest);
        expect(service).toBeDefined();
    });
});
```

# Advanced Test Bed Setup

In some cases additional imports or providers need to be provided to the test bed. For imports and
providers that would be re-used in multiple test files we can create a pre-configured setup function;
additional imports and providers can also be provided to the pre-configured setup functions.

In general providers should be mocked and not the actual service or injectable. A
[HelperMockProvider](../../../front_end/common/_mocks/helpers.test.ts) class has been created to make
this easier.

[See unit test mocking documentation for information on mocking and advanced uses](unit_test_mocking.md).

## Pre-configuring a setup function

If we want to re-use some imports and providers we can create a pre-configured setup function using
the [testBedSetupFactory](../../../front_end/test_utils/test_bed_setup_factory.ts) function.

```typescript
import { testBedSetupFactory } from 'test_utils/test_bed_setup_factory';
import { HelperMockProvider } from '@mocks/helpers.test';
import { SomeService } from '@services/some.service';
import { SomeModule } from '@services/some.module';

const imports = [SomeModule];

const someServiceMock = {
    someMethod: jest.fn()
};

const providers = [new HelperMockProvider(SomeService, someServiceMock)]

export const preConfiguredSetup = testBedSetupFactory({
    imports,
    providers
});
```

### Using a pre-configured setup function with additional imports and providers

If you wanted to extend the pre-configured setup function with additional imports and providers you
can pass them as arguments to the setup function.

```typescript
import { preConfiguredSetup } from './setup';
import { HelperMockProvider } from '@mocks/helpers.test';

import { AnotherService } from '@services/another.service';
import { AnotherModule } from '@services/another.module';

import { SomeComponent } from './some.component';

const imports = [AnotherModule];

const anotherServiceMock = {
    someMethod: jest.fn()
};

const providers = [new HelperMockProvider(AnotherService, anotherServiceMock)]

const componentInit = {
    someInput: 'someValue'
}

const testBed = await preConfiguredSetup(SomeComponent, componentInit, imports, providers);
```

### Using setupInjectableTestBed with additional imports and providers

If you want to use [setupInjectableTestBed](../../../front_end/test_utils/test_bed_setup_injectable.ts)
with additional imports and providers you can pass them as arguments to the setup function.

```typescript
const testBed = await setupInjectableTestBed(SomeService, imports, providers);
```
