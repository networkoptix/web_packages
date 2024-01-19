# Angular Unit Testing

We use jest to run our unit tests. General convention is to add a `*.spec.ts` file in the same directory
as the file or system under test. For example, if we have a component called `component-under-test.component.ts`
then we would add a `component-under-test.component.spec.ts` file in the same directory.

All test cases can be run with `npm run test` from the front_end folder and for a specific file
`npm run test -- --test-file=libs/components/test-examples/signals/signals.component.spec.ts`.

## Test Bed Setup

Testbed setup is fairly complicated within our current application architecture so we have a
[testBedSetupFactory function](../../../front_end/test_utils/test_bed_setup_factory.ts) that simplifies
the process.

In most cases the factory isn't used directly but we use a pre-configured version within
the `{library}/src/setup.ts` file. Example would be for components we use the `setupComponent` function
configured within the [libs/components/src/setup.ts](../../../front_end/libs/components/src/setup.ts) file.

[See test bed setup documentation for more information and advanced usage](test_bed_setup.md)

## Running Unit Tests

To run all tests locally you can run `npm run test` from the front_end folder.

[See running unit tests documentation for more information and advanced usage](running_unit_tests.md)

## Writing Unit Tests

Generally speaking we follow the AAA(Arrange, Act, Assert) pattern for writing unit tests.

### Arrange

For components not dependent on other services we can generally arrange the test using the
[setupComponent](../../../front_end/libs/components/src/setup.ts) function with initial inputs:

```typescript
const testBed = await setupComponent(SomeComponent, { someInput: 'someValue' });
```

For simple services and other injectables we can use the
[setupInjectableTestBed](../../../front_end/test_utils/test_bed_setup_injectable.ts) function:

```typescript
const testBed = await setupInjectableTestBed(SomeService);
```

Additionally for a component and injectable that is dependent on other provided injectable or stores
additional initialization might need to be done. See
[unit test mocking documentation](writing_unit_tests.md#mocking) for more information.

### Act

For most tests you'll need to call `detectChanges` function on the testBed after performing
actions on the component but before the assertions:

```typescript
// Execute actions
testBed.component.someInput = 'updateValue';

// Run change detection. This runs fixture.detectChanges()  and TestBed.flushEffects for injectable
testBed.detectChanges();
```

### Assert

For components we'll generally want to assert that the component rendered as expected:

```typescript
expect(
    debugElement.nativeElement.querySelector('#someElement').textContent
).toEqual(expectedValue)
```

For services and other injectables we'll generally want to assert some expected state:

```typescript
expect(await firstValueFrom(testBed.service.someState$)).toEqual(expectedValue);
```

[See writing unit tests documentation for more information and advanced usage](writing_unit_tests.md)