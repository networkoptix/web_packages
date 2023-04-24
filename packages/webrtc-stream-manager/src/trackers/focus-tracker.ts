// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { BaseTracker } from "./base-tracker";
import { calculateElementFocus } from '../utils';

/**
 * Track focus for use in tuning webRTC streams.
 *
 * Uses core from most focused element.
 */
export class FocusTracker extends BaseTracker<number> {
    metricName = 'focus';
    priorityWeight = 5;
    weight = 0;


    override checkPlayers = true;

    /**
     * Finds the most focused element in the document.
     *
     * @returns number
     */
    calculateFocusScore(): number {
        return this.videoElementRefs.reduce((mostFocused, element) => Math.max(mostFocused, calculateElementFocus(element)), 0)
    }

    /**
     * Use default metric handler.
     *
     * @param reset boolean
     * @returns number
     */
    getMetric(reset = false): number {
        return this.defaultMetricHandler(reset)
    };

    /**
     * Override the updateMetric method to use calculateFocusScore.
     *
     * @param now number
     * @returns number
     */
    override updateMetric(time: number): number {
        this.updateWindow(time)
        this.metricValues.push({ time, value: this.calculateFocusScore() });
        return this.getMetric();
    };
}
