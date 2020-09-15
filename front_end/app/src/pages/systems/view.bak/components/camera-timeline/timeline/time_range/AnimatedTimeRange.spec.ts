import AnimatedTimeRange from './AnimatedTimeRange'
import TimeRange from './TimeRange'

const sleep = (t) => new Promise(resolve => {
    setTimeout(resolve, t)
})

describe('AnimatedTimeRange', () => {

    let r

    beforeEach(() => {
        r = new AnimatedTimeRange(10, 30, AnimatedTimeRange.DEFAULT_CONFIG, 20)
    });

    it('can be instantiated', () => {
        expect(typeof AnimatedTimeRange).toEqual('function')
    })

    it('can be instantiated with defaults', () => {
        const defaultRange = new AnimatedTimeRange()
        expect(defaultRange.startTime).toEqual(0)
        expect(defaultRange.endTime).toEqual(0)
        expect(defaultRange.duration).toEqual(0)
    })

    it('contains correct startTime, endTime and duration', () => {
        expect(r.startTime).toEqual(10)
        expect(r.endTime).toEqual(30)
        expect(r.duration).toEqual(20)
    })

    it('does not update immediately', () => {
        expect(r.duration).toEqual(20)
        r.startTime = 15
        expect(r.duration).not.toEqual(15)
        r.endTime = 100
        expect(r.duration).not.toEqual(85)
    })

    it('animates to the proper result immediately', async () => {        
        expect(r.duration).toEqual(20)
        r.startTime = 15
        await sleep(30)
        expect(r.duration).toEqual(15)
        r.endTime = 100
        await sleep(30)
        expect(r.duration).toEqual(85)
    })

    it('can be cloned, and the clone is independent from the original', async () => {
        const original = r
        const clone = original.clone()
        
        expect(original.startTime).toEqual(10)
        expect(original.endTime).toEqual(30)
        expect(original.duration).toEqual(20)

        expect(clone.startTime).toEqual(10)
        expect(clone.endTime).toEqual(30)
        expect(clone.duration).toEqual(20)

        original.startTime = 5
        original.endTime = 15
        await sleep(30)

        expect(original.startTime).toEqual(5)
        expect(original.endTime).toEqual(15)
        expect(original.duration).toEqual(10)

        expect(clone.startTime).toEqual(10)
        expect(clone.endTime).toEqual(30)
        expect(clone.duration).toEqual(20)

        clone.startTime = 50
        clone.endTime = 150
        await sleep(30)

        expect(original.startTime).toEqual(5)
        expect(original.endTime).toEqual(15)
        expect(original.duration).toEqual(10)

        expect(clone.startTime).toEqual(50)
        expect(clone.endTime).toEqual(150)
        expect(clone.duration).toEqual(100)
    })

    it('can be cloned via fromRange, and the clone is independent from the original', async () => {
        const original = r
        const clone = AnimatedTimeRange.fromRange(original, TimeRange.DEFAULT_CONFIG, 20)
        
        expect(original.startTime).toEqual(10)
        expect(original.endTime).toEqual(30)
        expect(original.duration).toEqual(20)

        expect(clone.startTime).toEqual(10)
        expect(clone.endTime).toEqual(30)
        expect(clone.duration).toEqual(20)

        original.startTime = 5
        original.endTime = 15
        await sleep(30)

        expect(original.startTime).toEqual(5)
        expect(original.endTime).toEqual(15)
        expect(original.duration).toEqual(10)

        expect(clone.startTime).toEqual(10)
        expect(clone.endTime).toEqual(30)
        expect(clone.duration).toEqual(20)

        clone.startTime = 50
        clone.endTime = 150
        await sleep(30)

        expect(original.startTime).toEqual(5)
        expect(original.endTime).toEqual(15)
        expect(original.duration).toEqual(10)

        expect(clone.startTime).toEqual(50)
        expect(clone.endTime).toEqual(150)
        expect(clone.duration).toEqual(100)
    })

    it('can be resetted, and stays independent from the resetter', async () => {
        const resetter = new TimeRange(100, 150)
        r.reset(resetter)
        
        expect(r.startTime).toEqual(100)
        expect(r.endTime).toEqual(150)
        expect(r.duration).toEqual(50)

        expect(resetter.startTime).toEqual(100)
        expect(resetter.endTime).toEqual(150)
        expect(resetter.duration).toEqual(50)

        resetter.startTime = 50
        r.endTime = 200
        await sleep(30)

        expect(r.startTime).toEqual(100)
        expect(r.endTime).toEqual(200)
        expect(r.duration).toEqual(100)

        expect(resetter.startTime).toEqual(50)
        expect(resetter.endTime).toEqual(150)
        expect(resetter.duration).toEqual(100)
    })

    it('gives independent subranges', async () => {
        const original = r
        const fullSubRange = original.getSubRange(0, 1.0)
        
        expect(original.startTime).toEqual(10)
        expect(original.endTime).toEqual(30)
        expect(original.duration).toEqual(20)

        expect(fullSubRange.startTime).toEqual(10)
        expect(fullSubRange.endTime).toEqual(30)
        expect(fullSubRange.duration).toEqual(20)

        original.startTime = 5
        original.endTime = 15
        await sleep(30)

        expect(original.startTime).toEqual(5)
        expect(original.endTime).toEqual(15)
        expect(original.duration).toEqual(10)

        expect(fullSubRange.startTime).toEqual(10)
        expect(fullSubRange.endTime).toEqual(30)
        expect(fullSubRange.duration).toEqual(20)

        fullSubRange.startTime = 50
        fullSubRange.endTime = 150
        await sleep(30)

        expect(original.startTime).toEqual(5)
        expect(original.endTime).toEqual(15)
        expect(original.duration).toEqual(10)

        expect(fullSubRange.startTime).toEqual(50)
        expect(fullSubRange.endTime).toEqual(150)
        expect(fullSubRange.duration).toEqual(100)
    })

    it('gives correct subranges', () => {
        const subRange = r.getSubRange(0.25, 2.0)

        expect(subRange.startTime).toEqual(15)
        expect(subRange.endTime).toEqual(25)
        expect(subRange.duration).toEqual(10)
    });

    it('shifts correctly', async () => {
        r.shift(100)
        await sleep(30)
        expect(r.startTime).toEqual(110)
        expect(r.endTime).toEqual(130)
        expect(r.duration).toEqual(20)
        r.shift(100, true)
        expect(r.startTime).toEqual(210)
        expect(r.endTime).toEqual(230)
        expect(r.duration).toEqual(20)
    });

    it('force-trims correctly', () => {
        const trimmer = new TimeRange(15, 25)        
        let trimmed = r.clone()
        trimmed.trim(trimmer, true)
        expect(trimmed.startTime).toEqual(15)
        expect(trimmed.endTime).toEqual(25)
        expect(trimmed.duration).toEqual(10)
        
        trimmer.endTime = 100
        trimmed = r.clone()
        trimmed.trim(trimmer, true)
        expect(trimmed.startTime).toEqual(15)
        expect(trimmed.endTime).toEqual(30)
        expect(trimmed.duration).toEqual(15)

        trimmer.startTime = 0
        trimmed = r.clone()
        trimmed.trim(trimmer, true)
        expect(trimmed.startTime).toEqual(10)
        expect(trimmed.endTime).toEqual(30)
        expect(trimmed.duration).toEqual(20)
    });

    it('slow-trims correctly', async () => {
        const trimmer = new TimeRange(15, 25)        
        let trimmed = r.clone()
        trimmed.trim(trimmer)
        expect(trimmed.startTime).not.toEqual(15)
        expect(trimmed.endTime).not.toEqual(25)
        expect(trimmed.duration).not.toEqual(10)
        await sleep(30)
        expect(trimmed.startTime).toEqual(15)
        expect(trimmed.endTime).toEqual(25)
        expect(trimmed.duration).toEqual(10)        
    });

    it('force-expands correctly', () => {
        r.expand(100, 0.25, true)
        expect(r.startTime).toEqual(-15)
        expect(r.endTime).toEqual(105)
        expect(r.duration).toEqual(120)
    });

    it('slow-expands correctly', async () => {
        r.expand(100, 0.25)
        expect(r.startTime).not.toEqual(-15)
        expect(r.endTime).not.toEqual(105)
        expect(r.duration).not.toEqual(120)
        await sleep(30)
        expect(r.startTime).toEqual(-15)
        expect(r.endTime).toEqual(105)
        expect(r.duration).toEqual(120)
    });

    it('force-contracts correctly', () => {
        r.expand(100, 0.25, true)
        r.contract(100, 0.25, true)
        expect(r.startTime).toEqual(10)
        expect(r.endTime).toEqual(30)
        expect(r.duration).toEqual(20)
    });

    it('slow-contracts correctly', async () => {
        r.expand(100, 0.25)
        await sleep(30)
        r.contract(100, 0.25)
        expect(r.startTime).not.toEqual(10)
        expect(r.endTime).not.toEqual(30)
        expect(r.duration).not.toEqual(20)
        await sleep(30)
        expect(r.startTime).toEqual(10)
        expect(r.endTime).toEqual(30)
        expect(r.duration).toEqual(20)
    });

    it('force-moves to start correctly', () => {
        r.moveToStart(0, true)
        expect(r.startTime).toEqual(0)
        expect(r.endTime).toEqual(20)
        expect(r.duration).toEqual(20)
    });

    it('animates to start correctly', async () => {
        r.moveToStart(0)
        expect(r.startTime).not.toEqual(0)
        expect(r.endTime).not.toEqual(20)
        expect(r.duration).toEqual(20)
        await sleep(30)
        expect(r.startTime).toEqual(0)
        expect(r.endTime).toEqual(20)
        expect(r.duration).toEqual(20)
    });

    it('force-moves to end correctly', () => {
        r.moveToEnd(100, true)
        expect(r.startTime).toEqual(80)
        expect(r.endTime).toEqual(100)
        expect(r.duration).toEqual(20)
    });

    it('animates to end correctly', async () => {
        r.moveToEnd(100)
        expect(r.startTime).not.toEqual(80)
        expect(r.endTime).not.toEqual(100)
        expect(r.duration).toEqual(20)
        await sleep(30)
        expect(r.startTime).toEqual(80)
        expect(r.endTime).toEqual(100)
        expect(r.duration).toEqual(20)
    });

    it('produces correct string representations', () => {
        r = new AnimatedTimeRange(0, 1000)
        expect(r.startTimeString).toEqual('Thu Jan 01 1970 03:00:00')
        expect(r.endTimeString).toEqual('Thu Jan 01 1970 03:00:01')
        expect(r.toString()).toEqual('(Thu Jan 01 1970 03:00:00 - Thu Jan 01 1970 03:00:01), 1000ms')

        r = new AnimatedTimeRange(0, 1000, { stringification: { dateFormat: 'HH:MM:ss' } })
        expect(r.startTimeString).toEqual('03:00:00')
        expect(r.endTimeString).toEqual('03:00:01')
        expect(r.toString()).toEqual('(03:00:00 - 03:00:01), 1000ms')
    })
})
