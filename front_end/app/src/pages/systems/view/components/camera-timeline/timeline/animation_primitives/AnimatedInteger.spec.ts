import AnimatedInteger from './AnimatedInteger'

const sleep = (t) => new Promise(resolve => {
  setTimeout(resolve, t)
})

describe('AnimatedInteger', () => {

  let n
  const TEST_INITIAL_VALUE = 100

  beforeEach(() => {
    n = new AnimatedInteger(TEST_INITIAL_VALUE)
  });

  it('can be instantiated and has initial value right after that', () => {
    expect(typeof AnimatedInteger).toEqual('function')
    expect(n.get()).toEqual(TEST_INITIAL_VALUE)
  })

  it('has correct defaults', () => {
    n = new AnimatedInteger()
    
    expect(n.get()).toEqual(AnimatedInteger.DEFAULT_VALUE)
    expect(AnimatedInteger.DEFAULT_VALUE).toEqual(0)
    expect(n.value).toEqual(AnimatedInteger.DEFAULT_VALUE)
    expect(AnimatedInteger.DEFAULT_VALUE).toEqual(0)

    expect(n.animationDuration).toEqual(AnimatedInteger.DEFAULT_ANIMATION_DURATION)
    expect(AnimatedInteger.DEFAULT_ANIMATION_DURATION).toEqual(200)

    expect(n.easing).toEqual(AnimatedInteger.DEFAULT_EASING)
    expect(AnimatedInteger.DEFAULT_EASING).toEqual('linear')

    expect(n.lastChange).toEqual(0)
  })  

  it('actually animates and respects animation duration parameter', async () => {
    n.animationDuration = 20
    n.set(200)
    expect(n.value).toBeGreaterThanOrEqual(100)
    expect(n.value).toBeLessThan(110)
    expect(n.target).toEqual(200)
    const samples = []
    samples.push(n.get())
    await sleep(10)
    samples.push(n.get())
    await sleep(10)
    samples.push(n.get())
    await sleep(10)
    samples.push(n.get())
    expect(samples[0]).toBeGreaterThanOrEqual(100)
    expect(samples[0]).toBeLessThan(110)
    expect(samples[samples.length - 1]).toEqual(200)
    expect(samples[0] < samples[1]).toBeTrue()
    expect(samples[1] < samples[2]).toBeTrue()
    expect(samples[2] <= samples[3]).toBeTrue()
  })

  it('can abort animation', async () => {
    n.animationDuration = 20
    n.set(200)
    await sleep(10)
    n.abort()
    await sleep(30)
    expect(n.get()).toBeLessThan(200)
  })

  it('can force animation', async () => {
    n.animationDuration = 20
    n.set(200)
    await sleep(10)
    n.force()
    expect(n.get()).toEqual(200)
  })

  it('can be shifted in progress', async () => {
    n.animationDuration = 20
    n.set(200)
    n.forceShift(1000)
    expect(n.value).toBeGreaterThanOrEqual(1100)
    expect(n.value).toBeLessThan(1110)
    expect(n.target).toEqual(1200)
    const samples = []
    samples.push(n.get())
    await sleep(10)
    samples.push(n.get())
    await sleep(10)
    samples.push(n.get())
    await sleep(10)
    samples.push(n.get())
    expect(samples[0]).toBeGreaterThanOrEqual(1100)
    expect(samples[0]).toBeLessThan(1110)
    expect(samples[samples.length - 1]).toEqual(1200)
    expect(samples[0] < samples[1]).toBeTrue()
    expect(samples[1] < samples[2]).toBeTrue()
    expect(samples[2] <= samples[3]).toBeTrue()
  })

  it('returns an integer during the whole animation process', async () => {
    n.animationDuration = 20
    n.set(200.123)
    const samples = []
    samples.push(n.get())
    await sleep(10)
    samples.push(n.get())
    await sleep(10)
    samples.push(n.get())
    await sleep(10)
    samples.push(n.get())
    expect(samples.filter(v => v !== Math.round(v)).length).toEqual(0)
  })

})
