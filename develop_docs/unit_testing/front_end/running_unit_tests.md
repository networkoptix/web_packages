# Running Unit Tests
[&#8592; back to unit testing documentation](readme.md)

## Running all tests

To run all front end unit tests locally you can run `npm run test` from the front_end folder.

```bash
npm run test
```

To run all tests in watch mode you can run `npm run test:watch` from the front_end folder.

```bash
npm run test:watch
```

## Running tests on a single file

To run a tests on a single file you can run `npm run test -- --test-file=<path to test file>`
from the front_end folder.

```bash
npm run test -- --test-file=libs/components/test-examples/signals/signals.component.spec.ts
```

To run a single test in watch mode you can run `npm run test:watch -- --test-file=<path to test file>`
from the front_end folder.

```bash
npm run test:watch -- --test-file=libs/components/test-examples/signals/signals.component.spec.ts
```

## Running tests within IDE

TODO: Add VSCode and WebStorm screenshots and instructions.
