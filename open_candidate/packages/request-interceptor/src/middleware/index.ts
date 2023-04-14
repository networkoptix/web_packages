// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

export * from './abstract'
export * from './concrete'
export * from './nx-abstract'
export * from './nx-concrete'

/**
 * This module contains abstract as well as concrete middleware.
 *
 * Generally if you want to create a new middleware you would extend one of the abstract classes instead of the base `RequestMiddleware` class.
 *
 * The concrete middlewares usually used as is for specific use cases but the methods could be overridden if you need to customize the behavior.
 *
 * In addition to generalized middleware classes there are also middleware classes that are specific to working with Nx Meta products.
 *
 * The Nx Meta specific middleware classes are located in the `nx-abstract` and `nx-concrete` modules.
 */
