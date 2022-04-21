import { AnimatedFloat } from './AnimatedFloat';
import { IAnimated } from './IAnimated';
import { EASING } from './easing-functions';

type int = number;
type durationMs = number;

export class AnimatedInteger extends AnimatedFloat implements IAnimated<int> {
    static DEFAULT_VALUE = 0;
    static DEFAULT_ANIMATION_DURATION = 200;
    static DEFAULT_EASING: EASING = 'linear';

    constructor(
        initialValue: int = AnimatedInteger.DEFAULT_VALUE,
        protected _animationDuration: durationMs = AnimatedInteger.DEFAULT_ANIMATION_DURATION,
        protected _easing: EASING = AnimatedInteger.DEFAULT_EASING
    ) {
        super(initialValue, _animationDuration, _easing);
    }

    public set(v: int): void {
        super.set(v);
        this._target = Math.round(v);
    }

    public reset(v: int): void {
        this._value = Math.round(v);
        this._target = Math.round(v);
        this._lastChange = Date.now();
    }

    public forceShift(delta: durationMs): void {
        delta = Math.round(delta);
        super.forceShift(delta);
    }

    protected _getCurrentValue(dt: durationMs = Date.now() - this._lastChange) {
        return Math.round(super._getCurrentValue(dt));
    }
}
