import { Injectable } from '@angular/core';
import * as df from 'dateformat';

import { NxLanguageProviderService } from '@services/nx-language-provider';
import { VideoManagementSystemService } from '@vms-client/submodules/vms/services/vms.service';
import { ms, int, px } from '@vms-client/utils/type-aliases';

import { cfg } from '../../timeline.config';
import { TimelineService } from '../../timeline.service';
import { primaryRulerSerifDrawingConfigs } from '../drawingConfigs/primaryRulerSerifDrawingConfigs';

import { AnimatedFloat } from './animationPrimitives/AnimatedFloat';
import { primaryRulerDateFormats } from './dateformats/primary_ruler_date_formats';
import { IrregularLengthInterval } from './intervals/IrregularLengthInterval';
import {
    MAX_WEIGHT,
    MIN_WEIGHT, MIN_WIDTHS_FOR_INTERVALS
} from './intervals/cfg/MIN_WIDTH_FOR_INTERVALS';
import { irregularLengthIntervals } from './intervals/irregularLengthIntervals';
import {
    estimateIrregularLengthIntervalPessimistically
} from './intervals/utils/estimateIrregularLengthIntervalPessimistically';
import { isAlignedByIrregularInterval } from './intervals/utils/isAlignedByIrregularInterval';
import { getIntervalDiffDict } from './utils/getIntervalDiffDict';
import { percentageToHex } from './utils/percentageToHex';

const dateformat = df.default || df;

interface RulerSerif {
    interval: IrregularLengthInterval,
    time: ms,
    weight: int,
}

@Injectable({
    providedIn: 'root'
})
export class TimelinePrimaryRulerCanvasRendererService {
    constructor(
        languageService: NxLanguageProviderService,
        protected timeline: TimelineService,
        protected vms: VideoManagementSystemService
    ) {
        const timeLineTranslations = languageService.loadTimelineTranslations();
        if (timeLineTranslations) {
            dateformat.i18n = timeLineTranslations;
        }
    }

    protected _prevIntervals: Array<IrregularLengthInterval> = [];
    protected _lastIntervalChanges = {};
    protected _intervalWeightAnimations = {};

    protected _haveIntervalsChanged(newIntervals: Array<IrregularLengthInterval>) {
        if (this._prevIntervals.length !== newIntervals.length) {
            return true;
        }
        for (let i = 0; i < this._prevIntervals.length; i++) {
            if (this._prevIntervals[i] !== newIntervals[i]) {
                return true;
            }
        }
        return false;
    }

    public render(
        ctx: CanvasRenderingContext2D,
        intervalToSkip: IrregularLengthInterval | false = false
    ) {
        this._withContext(ctx, () => {
            const serifs = this._getSerifs().filter(s => s.weight > 0);
            if (intervalToSkip) {
                serifs.map(s =>
                    !isAlignedByIrregularInterval(
                        this.vms.tweakT(s.time),
                        intervalToSkip
                    ) && this._drawSerif(ctx, s)
                );
            } else {
                serifs.map(s => this._drawSerif(ctx, s));
            }
        });
    }

    protected _withContext(ctx, actualDrawing: () => void) {
        ctx.save();
        actualDrawing();
        ctx.restore();
    }

    protected _getIntervals(): Array<IrregularLengthInterval> {
        const result = [];
        for (const interval of irregularLengthIntervals) {
            const displayWidth = this.timeline.durationToDomWidth(
                estimateIrregularLengthIntervalPessimistically(interval)
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

    protected _getSerifs(): Array<RulerSerif> {
        const intervals = this._getIntervals();

        const ANIMATION_DURATION = 200;

        if (this._haveIntervalsChanged(intervals)) {
            const intervalDiffDict = getIntervalDiffDict(
                this._prevIntervals,
                intervals
            );
            Object.keys(intervalDiffDict).forEach(k => {
                const v = intervalDiffDict[k];
                if (v.length) {
                    this._lastIntervalChanges[k] = Date.now();
                    // HERE animations happen
                    if (k in this._intervalWeightAnimations) {
                        this._intervalWeightAnimations[k].set(v[1]);
                    } else {
                        this._intervalWeightAnimations[k] = new AnimatedFloat(
                            v[0],
                            ANIMATION_DURATION
                        );
                        this._intervalWeightAnimations[k].set(v[1]);
                    }
                }
            });
            this._prevIntervals = [...intervals];
        }

        if (!intervals || !intervals.length) return [];

        const smallestInterval = intervals[0];
        const intervalsReversed = [...intervals].reverse();
        return this.timeline.visibleRange
            .iterate(smallestInterval, this.vms.timeZoneOffset)
            .map(time => {
                const weight = this._getIntervalWeight(time, intervalsReversed);
                const interval = intervalsReversed.find(i =>
                    isAlignedByIrregularInterval(this.vms.tweakT(time), i)
                );
                const result = {
                    time,
                    weight,
                    interval
                };
                return result;
            }).filter(s => s.interval);
    }

    protected _getIntervalWeight(
        time: ms, intervalsReversed: Array<IrregularLengthInterval>
    ): int {
        const interval = intervalsReversed.find(i =>
            isAlignedByIrregularInterval(this.vms.tweakT(time), i)
        );
        const result = this._intervalWeightAnimations[interval]?.get() || 0;
        return result;
    }

    protected _drawSerif(ctx: CanvasRenderingContext2D, s: RulerSerif) {
        if (s.weight > MAX_WEIGHT || s.weight < MIN_WEIGHT) {
            return;
        }

        const lowerWeight = Math.floor(s.weight);
        const upperWeight = Math.ceil(s.weight);

        const lowerDrawingConfig = primaryRulerSerifDrawingConfigs[lowerWeight];
        const upperDrawingConfig = primaryRulerSerifDrawingConfigs[upperWeight];
        if (!lowerDrawingConfig || !upperDrawingConfig) {
            // console.warn('no drawing config found!', s, lowerWeight, upperWeight, lowerDrawingConfig, upperDrawingConfig)
            return;
        }

        const x: px = this.timeline.timeToCanvasOffsetX(s.time);

        const y0: px = Math.round(
            cfg.ruler.top.relativeHeight * this.timeline.canvasGeometry.height
        );
        const lowerHeight: px = Math.round(
            lowerDrawingConfig.heightRelative * this.timeline.canvasGeometry.height
        );
        const upperHeight: px = Math.round(
            upperDrawingConfig.heightRelative * this.timeline.canvasGeometry.height
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
        const relativeFontSize = lowerRelativeFontSize +
            (upperRelativeFontSize - lowerRelativeFontSize) * (s.weight - lowerWeight);
        const fontSize: px = Math.round(
            relativeFontSize * this.timeline.canvasGeometry.dpr
        );
        const format: string = primaryRulerDateFormats[s.interval];

        if (fontSize) {
            const labelLowerOpacity = lowerLabelCfg.opacity || lowerOpacity;
            const labelUpperOpacity = upperLabelCfg.opacity || upperOpacity;
            const labelOpacity = labelLowerOpacity +
                (labelUpperOpacity - labelLowerOpacity) * (s.weight - lowerWeight);

            ctx.fillStyle = `${color}${percentageToHex(labelOpacity)}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            const fontFace = 'Roboto, robotoregular, "Helvetica Neue", Arial, sans-serif';
            const dateStr = dateformat(this.vms.tweakT(s.time), format);
            ctx.font = `${fontSize}px ${fontFace}`;
            ctx.fillText(dateStr, x, y1 + 5);
        }
    }
}
