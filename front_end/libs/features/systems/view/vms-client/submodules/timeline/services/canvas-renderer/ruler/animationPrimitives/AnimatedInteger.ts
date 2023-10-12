import { AnimatedFloat } from './AnimatedFloat';
import { IAnimated } from './IAnimated';
import { EASING } from './easing-functions';

type int = number;
type durationMs = number;

export class AnimatedInteger extends AnimatedFloat implements IAnimated<int> {
    static override DEFAULT_VALUE = 0;
    static override DEFAULT_ANIMATION_DURATION = 200;
    static override DEFAULT_EASING: EASING = 'linear';

    constructor(
        initialValue: int = AnimatedInteger.DEFAULT_VALUE,
        protected override _animationDuration: durationMs = AnimatedInteger.DEFAULT_ANIMATION_DURATION,
        protected override _easing: EASING = AnimatedInteger.DEFAULT_EASING,
    ) {
        super(initialValue, _animationDuration, _easing);
    }

    public override set(v: int): void {
        super.set(v);
        this._target = Math.round(v);
    }

    public override reset(v: int): void {
        this._value = Math.round(v);
        this._target = Math.round(v);
        this._lastChange = Date.now();
    }

    public override forceShift(delta: durationMs): void {
        delta = Math.round(delta);
        super.forceShift(delta);
    }

    protected override _getCurrentValue(dt: durationMs = Date.now() - this._lastChange): int {
        return Math.round(super._getCurrentValue(dt));
    }
}
