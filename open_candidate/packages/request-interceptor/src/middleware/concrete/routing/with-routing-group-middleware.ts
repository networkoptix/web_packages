// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { RoutingGroupMiddleware } from "../../abstract/routing-middleware";
import { RequestHandler } from "../../../core";

/**
 * Generic `RoutingGroupMiddleware` implementation.
 *
 * This is useful if you want to handle creating `RoutingHandler` instances yourself.
 *
 * Most common patterns should have a concrete implementation of `RoutingGroupMiddleware` that you can use.
 *
 * These other implementations use configurations to create the `RoutingHandler` instances.
 */
export class WithRoutingGroupMiddleware extends RoutingGroupMiddleware {
    constructor(
        public routingHandlers: RequestHandler[]
    ) {
        super()
    }
}