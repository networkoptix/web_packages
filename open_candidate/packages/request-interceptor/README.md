![Nx Meta Logo](https://meta.nxvms.com/static/images/logo.png)

# Request Interceptor ![License: MPL--2.0"](https://img.shields.io/badge/License-MPL--2.0-yellow.svg)

## What is `@networkoptix/request-intereptor`?

This package allows intercepting request and applying middleware that can modify the request
before it is handled by the browser/node or to modify a response before it's return back to
the application.

## What can it do?

The `RequestInterceptor` class handles handles registering middleware that intercepts
requests and responses.

The middleware classes are all derived from the `RequestMiddleware` class. They can be configured
to handle requests, responses, or both.

The middleware applied to the requests/reponses in the order that they are declared.

---

## Usage

The `RequestInterceptor` class exposes a `register` static method which is used to initialize
the interceptor. This method accepts an array of `RequestMiddleware` to apply to requests/responses.

---

### Middleware

Included in the package are abstract and concrete classes for handling common use cases.

Generally concrete class names start with the word `With` to make it clear if it's an abstract or
concrete class. So `SomeMiddleware` would be an abstract class and `WithAnotherMiddleware` would
be a concrete class.

#### Abstract Middleware

An example abstract middleware class would be the `AuthenticationMiddleware` which defines
`shouldAuthenticate` and `authenticate` classes and simplifies creating concrete middleware
that handles various authentication schemes.

#### Concrete Middleware

An example abstract middleware class would be the `WithBearerMiddleware` which defines specific
implementation of the `shouldAuthenticate` and `authenticate` methods to handle bearer
token authentication.

#### Nx Meta Middleware

The `Nx Meta` middleware are specialized for interacting with `Nx Meta` services. These middleware
classes will start with either `Nx` for abstract classes or `WithNx` for concrete classes.

---

### Example of creating custom middleware from abstract class:


```typescript
import { AuthenticationMiddleware } from '@networkoptix/request-interceptor'

export class WithBearerMiddleware extends AuthenticationMiddleware {
    async authenticate(request: Request): Promise<void> {
        request.headers.set('authorization', `Bearer ${await this.getToken()}`);
    }

    constructor(
        private getToken: (request?: Request) => string | Promise<string>,
        protected shouldAuthenticate: (request?: Request) => boolean
    ) {
        super();
    }
}
```

---

### Example usage of concrete middleware:

The interceptor should be registered as early in the application lifecycle as possible.

For most applications it would be included in a `main.ts` or `main.js` file or a polyfills file.

```typescript
import { WithBearerMiddleware, RequestInterceptor } from '@networkoptix/request-interceptor'

import { getToken, shouldAuthenticate } './from-other-module'

const middlewares = [
  new WithBearerMiddleware(getToken, shouldAuthenticate)
]

RequestInterceptor.register(middlewares)
```
