![Nx Meta Logo](https://meta.nxvms.com/static/images/logo.png)

# Request Interceptor Example ![License: MPL--2.0"](https://img.shields.io/badge/License-MPL--2.0-yellow.svg)

This is an example of how to register the `@networkoptix/request-interceptor` with `WithVmsSessionMiddleware`
and `WithBearerMiddleware` authentication middlewares.

---

## How to start the demo

### Install workspace dependencies

From the root folder run `npm install`. This will install shared workspace dependencies and link local packages.

```sh
npm install
```

### Run demo

Running `npm start` will start running the demo.

```sh
npm start
```

### Open demo page

Open [http://127.0.0.1:5173](http://127.0.0.1:5173)

#### WithBearerMiddleware example

Enter the `accessToken` and `url` then click the button to make a request with bearer
authentication added automatically.

### WithVmsSessionMiddleware

Add demo page as a webpage in the`Nx Meta VMS` desktop client.

Enable `Allow Using Client API` for the webpage.

The desktop client will ask to allow sharing session with webpage.

After confirming the `accessToken` will automatically be populated witht he token scoped to that system.

You could then make authenticated request to that system.

---

## Demo Source code

The relevant part of the source code related to the `@networkoptix/request-interceptor` package
is in the [main.ts](./src/main.ts) file.

```typescript
import {
  RequestInterceptor,
  WithVmsSessionMiddleware,
  WithBearerMiddleware,
} from 'request-interceptor';

const getToken = () => document.querySelector<HTMLInputElement>('#token').value

const shouldAuthenticate = () => true

/**
 *
 */
RequestInterceptor.register([
  new WithFirstMiddleWare([
    new WithVmsSessionMiddleware(),
    new WithBearerMiddleware(getToken, shouldAuthenticate)
  ])
]);
```
