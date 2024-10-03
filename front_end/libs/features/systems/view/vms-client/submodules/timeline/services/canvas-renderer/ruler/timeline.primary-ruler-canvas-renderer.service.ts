import { Injectable } from '@angular/core';
import dateFormat from 'dateformat';

import { NxLanguageProviderService } from '@services/nx-language-provider';
import { int, ms, px } from '@view/datatypes/type-aliases';
import { VideoManagementSystemService } from '@view/services/vms.service';

import { cfg } from '../../timeline.config';
import { TimelineService } from '../../timeline.service';
import { NxDrawingConfigsService } from '../drawingConfigs/drowingConfigs.service';

import { AnimatedFloat } from './animationPrimitives/AnimatedFloat';
import { primaryRulerDateFormats } from './dateformats/primary_ruler_date_formats';
import { IrregularLengthInterval } from './intervals/IrregularLengthInterval';
import {
    MAX_WEIGHT,
    MIN_WEIGHT,
    MIN_WIDTHS_FOR_INTERVALS,
} from './intervals/cfg/MIN_WIDTH_FOR_INTERVALS';
import { irregularLengthIntervals } from './intervals/irregularLengthIntervals';
import { estimateIrregularLengthIntervalPessimistically } from './intervals/utils/estimateIrregularLengthIntervalPessimistically';
import { isAlignedByIrregularInterval } from './intervals/utils/isAlignedByIrregularInterval';
import { getIntervalDiffDict } from './utils/getIntervalDiffDict';
import { percentageToHex } from './utils/percentageToHex';

interface RulerSerif {
    interval: IrregularLengthInterval;
    time: ms;
    weight: int;
}

@Injectable({
    providedIn: 'root',
})
export class TimelinePrimaryRulerCanvasRendererService {
    constructor(
        languageService: NxLanguageProviderService,
        private timeline: TimelineService,
        private vms: VideoManagementSystemService,
        private drawingConfigService: NxDrawingConfigsService,
    ) {
        languageService.loadTimelineTranslations();
    }

    private prevIntervals: Array<IrregularLengthInterval> = [];
    private lastIntervalChanges: Record<string, number> = {};
    private intervalWeightAnimations: Record<string, AnimatedFloat> = {};

    private haveIntervalsChanged(newIntervals: Array<IrregularLengthInterval>): boolean {
        if (this.prevIntervals.length !== newIntervals.length) {
            return true;
        }
        for (let i = 0; i < this.prevIntervals.length; i++) {
            if (this.prevIntervals[i] !== newIntervals[i]) {
                return true;
            }
        }
        return false;
    }

    render(
        ctx: CanvasRenderingContext2D,
        intervalToSkip: IrregularLengthInterval | false = false,
    ): void {
        this.withContext(ctx, () => {
            const serifs = this.getSerifs().filter(s => s.weight > 0);
            if (intervalToSkip) {
                serifs.map(
                    s =>
                        !isAlignedByIrregularInterval(this.vms.tweakT(s.time), intervalToSkip) &&
                        this.drawSerif(ctx, s),
                );
            } else {
                serifs.map(s => this.drawSerif(ctx, s));
            }
        });
    }

    private withContext(ctx: CanvasRenderingContext2D, actualDrawing: () => void): void {
        ctx.save();
        actualDrawing();
        ctx.restore();
    }

    private getIntervals(): Array<IrregularLengthInterval> {
        const result: IrregularLengthInterval[] = [];
        for (const interval of irregularLengthIntervals) {
            const displayWidth = this.timeline.durationToDomWidth(
                estimateIrregularLengthIntervalPessimistically(interval),
            );
            const requiredWidth = MIN_WIDTHS_FOR_INTERVALS[interval][result.length];
            if (displayWidth >= requiredWidth) {
                result.push(interval);
                if (result.length >= MAX_WEIGHT) {
                    break;
                }
            }
        }
        return result;
    }

    private getSerifs(): Array<RulerSerif> {
        const intervals = this.getIntervals();

        const ANIMATION_DURATION = 200;

        if (this.haveIntervalsChanged(intervals)) {
            const intervalDiffDict = getIntervalDiffDict(this.prevIntervals, intervals);
            Object.keys(intervalDiffDict).forEach(k => {
                const v = intervalDiffDict[k];
                // @ts-expect-error TODO: Replace with Array.isArray()
                if (v.length) {
                    this.lastIntervalChanges[k] = Date.now();
                    // HERE animations happen
                    if (k in this.intervalWeightAnimations) {
                        this.intervalWeightAnimations[k].set(v[1]);
                    } else {
                        this.intervalWeightAnimations[k] = new AnimatedFloat(
                            v[0],
                            ANIMATION_DURATION,
                        );
                        this.intervalWeightAnimations[k].set(v[1]);
                    }
                }
            });
            this.prevIntervals = [...intervals];
        }

        if (!intervals || !intervals.length) {
            return [];
        }

        const smallestInterval = intervals[0];
        const intervalsReversed = [...intervals].reverse();
        return this.timeline.visibleRange
            .iterate(smallestInterval, this.vms.timeZoneOffset)
            .map(time => {
                const weight = this.getIntervalWeight(time, intervalsReversed);
                const interval = intervalsReversed.find(i =>
                    isAlignedByIrregularInterval(this.vms.tweakT(time), i),
                );
                const result = {
                    time,
                    weight,
                    interval,
                };
                return result;
            })
            .filter(s => s.interval);
    }

    private getIntervalWeight(time: ms, intervalsReversed: Array<IrregularLengthInterval>): int {
        const interval = intervalsReversed.find(i =>
            isAlignedByIrregularInterval(this.vms.tweakT(time), i),
        );
        return this.intervalWeightAnimations[interval]?.get() || 0;
    }

    private drawSerif(ctx: CanvasRenderingContext2D, s: RulerSerif): void {
        if (s.weight > MAX_WEIGHT || s.weight < MIN_WEIGHT) {
            return;
        }

        const lowerWeight = Math.floor(s.weight);
        const upperWeight = Math.ceil(s.weight);
        const lowerDrawingConfig =
            this.drawingConfigService.primaryRulerSerifDrawingConfigs(lowerWeight);
        const upperDrawingConfig =
            this.drawingConfigService.primaryRulerSerifDrawingConfigs(upperWeight);
        if (!lowerDrawingConfig || !upperDrawingConfig) {
            // console.warn('no drawing config found!', s, lowerWeight, upperWeight, lowerDrawingConfig, upperDrawingConfig)
            return;
        }

        const x: px = this.timeline.timeToCanvasOffsetX(s.time);

        const y0: px = Math.round(
            cfg.ruler.top.relativeHeight * this.timeline.canvasGeometry.height,
        );
        const lowerHeight: px = Math.round(
            lowerDrawingConfig.heightRelative * this.timeline.canvasGeometry.height,
        );
        const upperHeight: px = Math.round(
            upperDrawingConfig.heightRelative * this.timeline.canvasGeometry.height,
        );
        const height = lowerHeight + (upperHeight - lowerHeight) * (s.weight - lowerWeight);
        const y1 = y0 + height;

        const color = upperDrawingConfig.baseColorHex; // TODO: allow color transition, too
        const lowerOpacity = lowerDrawingConfig.opacity;
        const upperOpacity = upperDrawingConfig.opacity;
        const opacity = lowerOpacity + (upperOpacity - lowerOpacity) * (s.weight - lowerWeight);
        ctx.strokeStyle = `${color}${percentageToHex(opacity)}`;
        ctx.beginPath();
        ctx.moveTo(x, y0);
        ctx.lineTo(x, y1);
        ctx.stroke();

        const lowerLabelCfg = lowerDrawingConfig.label;
        const upperLabelCfg = upperDrawingConfig.label;
        if (!upperLabelCfg || !lowerLabelCfg) {
            return;
        }
        const lowerRelativeFontSize = lowerLabelCfg.fontSize;
        const upperRelativeFontSize = upperLabelCfg.fontSize;
        const relativeFontSize =
            lowerRelativeFontSize +
            (upperRelativeFontSize - lowerRelativeFontSize) * (s.weight - lowerWeight);
        const fontSize: px = Math.round(relativeFontSize * this.timeline.canvasGeometry.dpr);
        const format: string = primaryRulerDateFormats[s.interval];

        if (fontSize) {
            const labelLowerOpacity = lowerLabelCfg.opacity || lowerOpacity;
            const labelUpperOpacity = upperLabelCfg.opacity || upperOpacity;
            const labelOpacity =
                labelLowerOpacity +
                (labelUpperOpacity - labelLowerOpacity) * (s.weight - lowerWeight);

            ctx.fillStyle = `${color}${percentageToHex(labelOpacity)}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            const fontFace = 'Roboto, robotoregular, "Helvetica Neue", Arial, sans-serif';
            const dateStr = dateFormat(this.vms.tweakT(s.time), format);
            ctx.font = `${fontSize}px ${fontFace}`;
            ctx.fillText(dateStr, x, y1 + 5);
        }
    }
}
