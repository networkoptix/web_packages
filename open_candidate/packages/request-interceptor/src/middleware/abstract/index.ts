// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

export * from './authentication-middleware'
export * from './routing-middleware'

/**
 * This module contains abstract middleware.
 *
 * Generally if we want to create a new concrete middleware that doesn't extend one of the existing abstract classes we should try to break out any reusable behavior into an abstract class.
 */