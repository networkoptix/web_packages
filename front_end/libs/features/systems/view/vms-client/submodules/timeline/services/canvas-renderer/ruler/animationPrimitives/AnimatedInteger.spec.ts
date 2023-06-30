import { AnimatedInteger } from './AnimatedInteger';

describe('AnimatedInteger', () => {
    let animInt: AnimatedInteger;

    let dateNow: number;
    const TEST_INITIAL_VALUE = 100;

    beforeEach(() => {
        animInt = new AnimatedInteger(TEST_INITIAL_VALUE);
        dateNow = 5000;
        jest.spyOn(Date, 'now').mockImplementation(() => dateNow);
    });

    it('has initial value', () => {
        expect(animInt.get()).toEqual(TEST_INITIAL_VALUE);
    });

    it('has correct defaults', () => {
        animInt = new AnimatedInteger();

        expect(animInt.get()).toEqual(AnimatedInteger.DEFAULT_VALUE);
        expect(animInt.value).toEqual(AnimatedInteger.DEFAULT_VALUE);

        expect(animInt.animationDuration).toEqual(AnimatedInteger.DEFAULT_ANIMATION_DURATION);

        expect(animInt.easing).toEqual(AnimatedInteger.DEFAULT_EASING);

        expect(animInt.lastChange).toEqual(0);
    });

    it('actually animates and respects animation duration parameter', () => {
        animInt.animationDuration = 20;
        animInt.set(200);
        expect(animInt.value).toEqual(100);
        expect(animInt.target).toEqual(200);
        const samples: number[] = [];
        samples.push(animInt.get());
        dateNow += 10;
        samples.push(animInt.get());
        dateNow += 10;
        samples.push(animInt.get());
        dateNow += 10;
        samples.push(animInt.get());
        expect(samples[0]).toEqual(100);
        expect(samples[0]).toBeLessThan(samples[1]);
        expect(samples[1]).toBeLessThan(samples[2]);
        expect(samples[2]).toEqual(200);
        expect(samples[3]).toEqual(200);
    });

    it('can abort animation', () => {
        animInt.animationDuration = 20;
        animInt.set(200);
        dateNow += 10;
        animInt.abort();
        dateNow += 30;
        expect(animInt.get()).toEqual(175);
    });

    it('can force animation', () => {
        animInt.animationDuration = 20;
        animInt.set(200);
        dateNow += 10;
        animInt.force();
        expect(animInt.get()).toEqual(200);
    });

    it('can be shifted in progress', () => {
        animInt.animationDuration = 20;
        animInt.set(200);
        animInt.forceShift(1000);
        expect(animInt.value).toEqual(1100);
        expect(animInt.target).toEqual(1200);
        const samples: number[] = [];
        samples.push(animInt.get());
        dateNow += 10;
        samples.push(animInt.get());
        dateNow += 10;
        samples.push(animInt.get());
        dateNow += 10;
        samples.push(animInt.get());
        expect(samples[0]).toEqual(1100);
        expect(samples[0]).toBeLessThan(samples[1]);
        expect(samples[1]).toBeLessThan(samples[2]);
        expect(samples[2]).toEqual(1200);
        expect(samples[3]).toEqual(1200);
    });

    it('returns an integer during the whole animation process', () => {
        animInt.animationDuration = 20;
        animInt.set(200.123);
        const samples: number[] = [];
        samples.push(animInt.get());
        dateNow += 10;
        samples.push(animInt.get());
        dateNow += 10;
        samples.push(animInt.get());
        dateNow += 10;
        samples.push(animInt.get());
        expect(samples.filter(v => v !== Math.round(v)).length).toEqual(0);
    });
});
