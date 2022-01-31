import AnimatedFloat from './AnimatedFloat';

const sleep = t => new Promise(resolve => {
    setTimeout(resolve, t);
});

describe('AnimatedFloat', () => {
    let n;
    const TEST_INITIAL_VALUE = 100.0;

    beforeEach(() => {
        n = new AnimatedFloat(TEST_INITIAL_VALUE);
    });

    it('can be instantiated and has initial value right after that', () => {
        expect(typeof AnimatedFloat).toEqual('function');
        expect(n.get()).toEqual(TEST_INITIAL_VALUE);
    });

    it('has correct defaults', () => {
        n = new AnimatedFloat();

        expect(n.get()).toEqual(AnimatedFloat.DEFAULT_VALUE);
        expect(AnimatedFloat.DEFAULT_VALUE).toBeCloseTo(0.0);
        expect(n.value).toEqual(AnimatedFloat.DEFAULT_VALUE);
        expect(AnimatedFloat.DEFAULT_VALUE).toBeCloseTo(0.0);

        expect(n.animationDuration).toEqual(AnimatedFloat.DEFAULT_ANIMATION_DURATION);
        expect(AnimatedFloat.DEFAULT_ANIMATION_DURATION).toBeCloseTo(200.0);

        expect(n.easing).toEqual(AnimatedFloat.DEFAULT_EASING);
        expect(AnimatedFloat.DEFAULT_EASING).toEqual('ease-in-out-sine');

        expect(n.lastChange).toBeCloseTo(0.0);
    });

    it('actually animates and respects animation duration parameter', async() => {
        n.animationDuration = 20;
        n.set(200.0);
        expect(n.value).toBeGreaterThanOrEqual(100);
        expect(n.value).toBeLessThan(110);
        expect(n.target).toBeCloseTo(200.0);
        const samples = [];
        samples.push(n.get());
        await sleep(10);
        samples.push(n.get());
        await sleep(10);
        samples.push(n.get());
        await sleep(10);
        samples.push(n.get());
        expect(samples[0]).toBeGreaterThanOrEqual(100);
        expect(samples[0]).toBeLessThan(110);
        expect(samples[samples.length - 1]).toBeCloseTo(200.0);
        expect(samples[0] < samples[1]).toBeTrue();
        expect(samples[1] < samples[2]).toBeTrue();
        expect(samples[2] <= samples[3]).toBeTrue();
    });

    it('can abort animation', async() => {
        n.animationDuration = 20;
        n.set(200.0);
        await sleep(10);
        n.abort();
        await sleep(30);
        expect(n.get()).toBeLessThan(200.0);
    });

    it('can force animation', async() => {
        n.animationDuration = 20;
        n.set(200.0);
        await sleep(10);
        n.force();
        expect(n.get()).toBeCloseTo(200.0);
    });

    it('can be shifted in progress', async() => {
        n.animationDuration = 20;
        n.set(200.0);
        n.forceShift(1000);
        expect(n.value).toBeGreaterThanOrEqual(1100);
        expect(n.value).toBeLessThan(1110);
        expect(n.target).toBeCloseTo(1200.0);
        const samples = [];
        samples.push(n.get());
        await sleep(10);
        samples.push(n.get());
        await sleep(10);
        samples.push(n.get());
        await sleep(10);
        samples.push(n.get());
        expect(samples[0]).toBeGreaterThanOrEqual(1100);
        expect(samples[0]).toBeLessThan(1110);
        expect(samples[samples.length - 1]).toBeCloseTo(1200.0);
        expect(samples[0] < samples[1]).toBeTrue();
        expect(samples[1] < samples[2]).toBeTrue();
        expect(samples[2] <= samples[3]).toBeTrue();
    });

    it('returns floats during the whole animation process', async() => {
        n.animationDuration = 20;
        n.set(200.123);
        const samples = [];
        samples.push(n.get());
        await sleep(10);
        samples.push(n.get());
        await sleep(10);
        samples.push(n.get());
        await sleep(10);
        samples.push(n.get());
        expect(samples.filter(v => v !== Math.round(v)).length).toBeGreaterThan(2);
    });
});
