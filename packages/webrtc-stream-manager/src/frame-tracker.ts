// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

/**
 * Track Video Perforamance for use in tuning webRTC streams
 */
export class FrameTracker {
    players = 0;
    start = Infinity;
    end = 0;
    frames = 0;

    #reset = (): void => {
        this.start = performance.now();
        this.end = 0;
        this.frames = 0;
    };

    /**
     * Get currently accumulated frame count, optionally reset count after calculating current value.
     *
     * @param reset Whether to reset frame counters
     * @returns number
     */
    getFps = (reset = false): number => {
        if (!this.players || !this.frames || this.start === this.end) {
            return 0;
        }

        const seconds = (this.end - this.start) / 1000;
        const fps = Math.round(this.frames / seconds / this.players);

        if (reset) {
            this.#reset();
        }

        return fps;
    };

    /**
     * Updates accumulated frame counters and returns current fps.
     *
     * @param now number
     * @returns number
     */
    updateFrame = (now: number): number => {
        this.start = Math.min(this.start, now);
        this.end = Math.max(this.start, now);
        this.frames++;
        return this.getFps();
    };
}
