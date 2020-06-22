# The Meditation on Rulers
## Formulating The Problem
0. We have a TimeLine
1. We need to mark certain reference points in time on it
2. What we consider such points depends on the scale we are at:
   for a huge time range we care to tick century or millenia edges only,
   while when zoomed in dramatically we might want to mark every millisecond with a serif
3. Furthermore, we want to have serifs of different *weight*: e.g. the largest for centuries,
   a little smaller for decades, even smaller for years, and tiny for months.
4. As we zoom in and out dynamically, we want to animate transitions of serifs changing their weights.
   E.g. if we zoom out from a single year to a decade, we want day-ticks to disappear,
   month and year ticks to get smaller, and some year ticks to remain of the same weight,
   but now marking decades, not just years.
5. Two additional obstacles make it even trickier:
   1) there are timezones, and
   2) months, years and decades are of irregular length in terms of milliseconds

## Outlining The Problem Answer Format
### Prerequisite Types
First, let's clarify some definitions we'll use later on:
```ts
// "can't enforce" doesn't mean "shouldn't try to clarify the intentions"
type float = number
type int = number
// `Ms` postfix means `milliseconds`
type durationMs = int 
type timeStampMs = int
```
### Starting Really Simple
Let's start with a simple case, ignoring everything but (0-2) for now.
Turns out, all we would want to see as an answer then is as follows:
```ts
interface DegeneratelySimpleCaseAnswer {
  first: timeStampMs,
  last: timeStampMs,
  interval: durationMs,
}
```
From here, we might go two ways, choosing what complications to introduce to our model first:
*serif weigths*, or *interval length irregularities*.

### Introducing Serif Weights
If first case, the change we'd need is rather simple:
```ts
type weight = int // 0 for no serif, 1 for a tiny one, 2 for a slightly larger, etc.
// alternatively, we may want to use a more strict `type weight = 1 | 2 | 3 ...` definition.

interface SerifWeightsAnswer extends DegeneratelySimpleCaseAnswer {
  weight: weight,
}
```

### Introducing Interval Length Irregularities
If we choose the second path, the changes would be more significant:
```ts
interface Serif {
  when: timeStampMs
}

interface WeightedSerif extends Serif {
  weight: weight,
}

type SerifsAnswer = Array<WeightedSerif> // assert it's ordered
```
We can not rely on `first, last, interval` approach now, as there is no `interval`,
so we need to list all the ticks explicitly. Least assured, the serifs come in order
from the earliest to the latest.

### Introducing Animations
Good news, the only thing we'd need to introduce animations is changing the definition of weight.
```ts
type weight = float
```
In a stable case, the weight will be integer, as before. During a transition, hovewer,
it will be a float number between the previous and target integer weights.

## Getting the Answer
### The Input We Have
As input, we have these:
* current `visible range` (given by `start time`, `end time`, `duration`, in *milliseconds*)
* current `target canvas width` (in *canvas pixels*)
What we can immediately compute are:
* `pixels per millisecond ratio` and
* `milliseconds per pixel ratio`,
which are obviously inverse to each other.
Then, we can make a decision on what `interval` (not necessarily regular) to choose for our **weight 1**.
There could be different strategies for making this choice, but for now let's just say we have one:
```ts
// support more, if you want — it's your call
type PossiblyIrregularInterval = 'millenia' | 'century' | 'decade' | 'year' | 'month' | int

type FWeightOneIntervalChooser = (msPerPixel: float): PossiblyIrregularInterval
```
If we don't support weights yet, that's all we need for now. Otherwise, we'll move to an array-producing chooser:
```ts
type FWeightIntervalChooser = (msPerPixel: float): Array<PossiblyIrregularInterval>
```
Then, given the weight(s), we can produce the answer. In case intervals were regular, we would just do:
```ts
interface IDuratedTimeRange {
  start: timeStampMs,
  end: timeStampMs,
  duration: durationMs,
}
const getDegeneratelySimpleRulerConfiguration (
  visibleRange: IDuratedTimeRange,
  canvas: HTMLCanvasElement
): DegeneratelySimpleCaseAnswer {
  const msPerPixel = visibleRange.duration / canvas.width
  const interval = <int>(<FWeightOneIntervalChooser>getInterval)(msPerPixel)
  return {
    first: Math.floor(visibleRange.start % interval),
    last: Math.ceil(visibleRange.end % interval),
    interval,
  }
}
```
In case of possibly irregular intervals, we won't get off that easy:
```ts
type FFirstSerifAligner = (startTime: timeStampMs, interval: PossiblyIrregularInterval): timeStampMs
type FLastSerifAligner = (endTime: timeStampMs, interval: PossiblyIrregularInterval): timeStampMs
type FNextSerifAligner = (prevTime: timeStampMs, interval: PossiblyIrregularInterval): timeStampMs

const getDegeneratelySimpleRulerConfiguration (
  visibleRange: IDuratedTimeRange,
  canvas: HTMLCanvasElement
): DegeneratelySimpleCaseAnswer {
  const msPerPixel = visibleRange.duration / canvas.width
  const interval = <int>(<FWeightOneIntervalChooser>getInterval)(msPerPixel)
  const first = (<FFirstSerifAligner>)getFirstSerifTime(visibleRange.start, interval)
  const last = (<FLastSerifAligner>)getFirstSerifTime(visibleRange.end, interval)
  return getListOfSerifTimes(first, interval, last)
}

const getListOfSerifTimes (first: timeStampMs, interval: PossiblyIrregularInterval, last: timeStampMs): Array<timeStampMs> {
  const result = [first]
  let prev = first, next
  while (
    (next = (<FNextSerifAligner>getNextSerifTime)(prev)) < last
  ) {
    result.append(next)
    prev = next
  }
  result.append(last)
  return result
}
```
`*SerifTimeGetter` logic is not too tricky: it's basically JavaScript `Date` manipulation, like `setMonth(0)` etc.
Introducing weights doesn't make it much harder, too: we just need to assign a certain weight to each serif time:
```ts
type FSingleSerifWeightAssigner = (when: timeStampMs, weights: Array<PossiblyIrregularInterval>): WeightedSerif
type FSerifListWeightAssigner = (serifTimes: Array<timeStampMs>, weights: Array<PossiblyIrregularInterval>): Array<WeightedSerif>

const weightSerifs: FSerifListWeightAssigner = (serifTimes, weights) => serifTimes.map(
  when: timeStampMs => ({
    when,
    weight: (<FSingleSerifWeightAssigner>getSerifWeight)(when, weights)
  })
)
```
And the real logic behind this one would be just 'return the biggest weight the serif alignes to'.

Now, animations. Given we have two *static* `Array<WeightedSerif>` instances, as well as timestamps for animation progress estimation,
we can produce the intermediate, *float-weighted*, description, which will be exactly the answer we're looking for. Say, we had:
```ts
// [0 ... 40 ] time range, large serifs every 20 ms, smaller ones every 10ms in between
const previousEstablishedSerifConfiguration: Array<WeightedSerif> = [
  {
    weight: 2,
    when: 0,
  },
  {
    weight: 1,
    when: 10,
  },
  {
    weight: 2,
    when: 20,
  },
  {
    weight: 1,
    when: 30,
  },
  {
    weight: 2,
    when: 40,
  },
]

type percentage = float
// let's say we're halfway through the animation
const animationProgress: percentage = 0.5

// we targeted zooming x2 in twice into the first half, so it's 
// [0 ... 20 ] time range, large serifs every 10ms, smaller every 5ms
const animationTargetSerifConfiguration: Array<WeightedSerif> = [
  {
    weight: 2,
    when: 0,
  },
  {
    weight: 1,
    when: 5,
  },
  {
    weight: 2,
    when: 10,
  },
  {
    weight: 1,
    when: 15,
  },
  {
    weight: 2,
    when: 20,
  },
  // still need to provide the rest, until 40ms
  {
    weight: 1,
    when: 25,
  },
  {
    weight: 2,
    when: 30,
  },
  // the two last are optional, given we're halfway through the animation
  {
    weight: 1,
    when: 35,
  },
  {
    weight: 2,
    when: 40,
  },
]

// so, if we blend these two...
const intermediateSerifConfiguration: Array<WeightedSerif> = [
  {
    weight: 2, // no changes
    when: 0,
  },
  {
    weight: 0.5, // rising from 0 to 1
    when: 5,
  },
  {
    weight: 1.5, // rising from 1 to 2
    when: 10,
  },
  {
    weight: 0.5,
    when: 15,
  },
  {
    weight: 2,
    when: 20,
  },
  {
    weight: 0.5,
    when: 25,
  },
  {
    weight: 1.5,
    when: 30,
  },
  {
    weight: 0.5,
    when: 35,
  },
  {
    weight: 2,
    when: 40,
  },
]
```
How to deal with this intermediate values, including the easing function choice, is up to the renderer.
The exact procedure of combining two static configurations into the animation intermediate one is...
*left as an exercise for the reader* ;)
