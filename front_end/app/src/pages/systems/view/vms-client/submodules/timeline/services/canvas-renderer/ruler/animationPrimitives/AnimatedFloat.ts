import { IAnimated } from './IAnimated';
import { easeInOutSine, EASING } from './easing-functions';

type float = number;
type durationMs = number;
type timeStampMs = number;

export class AnimatedFloat implements IAnimated<float> {
    protected _value: float;
    protected _target: float;
    protected _lastChange: timeStampMs;

    static DEFAULT_VALUE = 0.0;
    static DEFAULT_ANIMATION_DURATION = 200;
    static DEFAULT_EASING: EASING = 'ease-in-out-sine';

    constructor(
        initialValue: float = AnimatedFloat.DEFAULT_VALUE,
        protected _animationDuration: durationMs = AnimatedFloat.DEFAULT_ANIMATION_DURATION,
        protected _easing: EASING = AnimatedFloat.DEFAULT_EASING
    ) {
        this.reset(initialValue);
        this._lastChange = 0;
    }

    public get value() {
        return this._value;
    }

    public get target() {
        return this._target;
    }

    public get lastChange() {
        return this._lastChange;
    }

    public get animationDuration() {
        return this._animationDuration;
    }

    public set animationDuration(newDuration: durationMs) {
        this._animationDuration = newDuration;
    }

    public get easing() {
        return this._easing;
    }

    public set(v: float) {
        // if (v > 4 || v < 0) console.log('SET', v)
        this._value = this._getCurrentValue();
        this._target = v;
        this._lastChange = Date.now();
    }

    public get(): float {
        let result;
        if (this._value === this._target) {
            result = this._value;
        } else {
            const dt = Date.now() - this._lastChange;
            if (dt < this._animationDuration) {
                result = this._getCurrentValue(dt);
            } else {
                this._value = this._target;
                result = this._target;
            }
        }
        return result;
    }

    public reset(v: float) {
        // if (v > 4 || v < 0) console.log('RESET', v)
        this._value = v;
        this._target = v;
        this._lastChange = Date.now();
    }

    public abort() {
        this._value = this._getCurrentValue();
        this._target = this._getCurrentValue();
        this._lastChange = Date.now();
    }

    public force() {
        this._value = this._target;
        this._lastChange = Date.now();
    }

    public forceShift(dt: durationMs) {
        this._value += dt;
        this._target += dt;
    }

    protected _getCurrentValue(dt: durationMs = Date.now() - this._lastChange) {
        switch (this._easing) {
            case 'ease-in-out':
            case 'ease-in-out-sine':
                return this._value + (this._target - this._value) * easeInOutSine(dt / this._animationDuration);
            case 'linear':
            default:
                const result = this._value + (this._target - this._value) * dt / this._animationDuration;
                // if (result > 4 || result < 0) console.log('GCV', result, this._value, this._target, this)
                return result;
        }
    }
}
