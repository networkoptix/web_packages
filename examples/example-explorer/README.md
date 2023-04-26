![Nx Meta Logo](https://meta.nxvms.com/static/images/logo.png)

# Open Source Example Explorer Demo Page ![License: MPL--2.0"](https://img.shields.io/badge/License-MPL--2.0-yellow.svg)

This package is used for displaying the examples for our open source packages.

This is mostly used internally for our CI to deploy static deploy targets like GitHub pages.

---

## Install workspace dependencies

From the root folder run `npm install`. This will install shared workspace dependenciesand link local packages.

```sh
npm install
```

---

## How to start the demo

Running `npm start` command will start running the demo.

```sh
npm start
```

### Open demo page

Open [http://127.0.0.1:5173](http://127.0.0.1:5173).

---

## How to deploy the demo
Running the `npm run build:demo` command will build the `example-explorer` along with it's dependencies.

```sh
npm run build:demo
```

### Distribution

The compiled code will be saved to `examples/dist/example-explorer`.

The contents of this folder can be hosted on any static web server.
