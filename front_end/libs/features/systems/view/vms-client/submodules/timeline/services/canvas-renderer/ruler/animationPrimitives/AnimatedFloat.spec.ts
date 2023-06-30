import { AnimatedFloat } from './AnimatedFloat';

describe('AnimatedFloat', () => {
    let animFloat: AnimatedFloat;

    let dateNow: number;
    const TEST_INITIAL_VALUE = 100.0;

    beforeEach(() => {
        animFloat = new AnimatedFloat(TEST_INITIAL_VALUE);
        dateNow = 5000;
        jest.spyOn(Date, 'now').mockImplementation(() => dateNow);
    });

    it('has initial value', () => {
        expect(animFloat.get()).toEqual(TEST_INITIAL_VALUE);
    });

    it('has correct defaults', () => {
        animFloat = new AnimatedFloat();

        expect(animFloat.get()).toEqual(AnimatedFloat.DEFAULT_VALUE);
        expect(animFloat.value).toEqual(AnimatedFloat.DEFAULT_VALUE);

        expect(animFloat.animationDuration).toEqual(AnimatedFloat.DEFAULT_ANIMATION_DURATION);

        expect(animFloat.easing).toEqual(AnimatedFloat.DEFAULT_EASING);

        expect(animFloat.lastChange).toEqual(0);
    });

    it('actually animates and respects animation duration parameter', () => {
        animFloat.animationDuration = 20;
        animFloat.set(200.0);
        expect(animFloat.value).toBeCloseTo(100.0);
        expect(animFloat.target).toBeCloseTo(200.0);
        const samples: number[] = [];
        samples.push(animFloat.get());
        dateNow += 10;
        samples.push(animFloat.get());
        dateNow += 10;
        samples.push(animFloat.get());
        dateNow += 10;
        samples.push(animFloat.get());
        expect(samples[0]).toBeCloseTo(100.0);
        expect(samples[0]).toBeLessThan(samples[1]);
        expect(samples[1]).toBeLessThan(samples[2]);
        expect(samples[2]).toBeCloseTo(200.0);
        expect(samples[3]).toBeCloseTo(200.0);
    });

    it('can abort animation', () => {
        animFloat.animationDuration = 20;
        animFloat.set(200.0);
        dateNow += 10;
        animFloat.abort();
        dateNow += 30;
        expect(animFloat.get()).toBeCloseTo(175.0);
    });

    it('can force animation', () => {
        animFloat.animationDuration = 20;
        animFloat.set(200.0);
        dateNow += 10;
        animFloat.force();
        expect(animFloat.get()).toBeCloseTo(200.0);
    });

    it('can be shifted in progress', () => {
        animFloat.animationDuration = 20;
        animFloat.set(200.0);
        animFloat.forceShift(1000);
        expect(animFloat.value).toBeCloseTo(1100.0);
        expect(animFloat.target).toBeCloseTo(1200.0);
        const samples: number[] = [];
        samples.push(animFloat.get());
        dateNow += 10;
        samples.push(animFloat.get());
        dateNow += 10;
        samples.push(animFloat.get());
        dateNow += 10;
        samples.push(animFloat.get());
        expect(samples[0]).toBeCloseTo(1100);
        expect(samples[0]).toBeLessThan(samples[1]);
        expect(samples[1]).toBeLessThan(samples[2]);
        expect(samples[2]).toBeCloseTo(1200.0);
        expect(samples[3]).toBeCloseTo(1200.0);
    });

    it('returns floats during the whole animation process', () => {
        animFloat.animationDuration = 20;
        animFloat.set(200.123);
        const samples: number[] = [];
        samples.push(animFloat.get());
        dateNow += 10;
        samples.push(animFloat.get());
        dateNow += 10;
        samples.push(animFloat.get());
        dateNow += 10;
        samples.push(animFloat.get());
        expect(samples.filter(v => v !== Math.round(v)).length).toBeGreaterThan(2);
    });
});
