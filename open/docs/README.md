# Nx Meta Platform Open Source Web Packages

// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

---

## Introduction

This repository `nx_open_cloud_portal` contains **Network Optix Meta Platform open source web
packages** - the source code and published packages are used in building Nx Meta Cloud Portal,
Webadmin, and various web projects within Network Optix.

### Contribution policy

At this moment, Network Optix is not able to process any pull/merge requests to this repository. It
is likely that a policy for contributions will be developed and offered in the future.

---

## Published Packages

For libraries contained in this repository the compiled packages will be published to the
appropriate package manager.

### Published packages can be found on the links below.

- Javascript / Typescript (NPM): https://www.npmjs.com/org/networkoptix

---

## Project Structure

The repository is set up as a monorepo with the root folder containing shared files for maintaining
the project. The source code relevant to external developers is in `/packages` and `/examples`.

### Packages / Libraries

The `/packages` directory contains the source code for our published packages. The Javascript packages
are all written in Typescript with type definitions and source maps included so it's suggested that
these are added to your project through NPM.

### Demos and Examples

The `/examples` directory contains usage examples for some of the packages in `/packages` and also
some general examples for interacting with the Nx Witness Video Management System (VMS) Server.

All Javascript/Node examples contain an `npm start` script for running the demo/example.

Examples for a specific package in `/packages` ends with `-example` so the
`/webrtc-stream-manager-example` is for the `/webrtc-stream-manager` package.

General demos for interacting with the VMS Server end with `-demo`. These demos will probably use
one or more packages from `/packages` but are purposed with demonstrating interactions instead of
being instructional on a specific package.

---

## Free and Open-Source Software Notices

The Nx Meta Platform Open Source Web Packages incorporates, depends upon, interacts with,
or was developed using a number of free and open-source software components. The full list of such
components can be found at [OPEN SOURCE SOFTWARE DISCLOSURE](https://meta.nxvms.com/content/libraries/).
Please see the linked component websites for additional licensing, dependency, and use information,
as well as the component source code.
