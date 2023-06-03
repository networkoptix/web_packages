# WebRtcStreamManager Switching Algorithm

// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

---

## Overview

The WebRtcStreamManager is able to connect to multiple streams which could put a lot of load on the
peer connections; it is easy to saturate the connection from either the client side or mediaserver
side when viewing several primary streams at once.

The switching algorithm aims to address those issues by monitoring connection health and elment focus
to determine which streams to play. The FPS is indirectly taken into account as part of connection
health but is also exposed in case the developer wants to use it to downgrade the stream on their
own or show some indicator on the UI if the stream drops below a certain threshold for an extended
amount of time.

---

## The Algorithm

Described is the logic to determine if a stream should be switched. Each step in the series of steps
need to be true for switching to occur. If any step is false then streams are currently nominal.
The objective of the algorithm is to determine if we should attempt switching and what stream to switch.

1. Check if MOS score is out of nominal range. Example would be a MOS score of 2 should try to downgrade.
2. Sort streams by priority, descending if upgrade is desired else ascending if downgrade is desired.
3. Find first stream that matches canUpgrade or canDowngrade.
    * canUpgrade: True if currently using secondary stream and focus above HIGH_QUALITY_FOCUS_SCORE_THRESHOLD.
    * canDowngrade: True if currently using primary stream.
4. If stream was matched then switch that stream.


*NOTES:*

In the future we'll add canUpgrade and canDowngrade methods to the BaseTracker abstract class.
To allow customizing the algorithm behavior by registering customized trackers.

---

### Tracker Sampling

The algorithm samples all tracker metrics once a second and uses the trailing five seconds average
as that trackers score.

Once every three seconds the aggregated metrics are read by the switching algorithm.

---

### Trackers

Trackers other than the MosScoreTracker provide a weighted metric score which is the weight assigned
to the tracker multiplied by normalized 1 to 5 score. This weighted metric score is used by the
algorith to prioritize which streams to check first.

#### MOS (Mean Opinion Score) Tracker

The MosScoreTracker uses a generic MOS calculation algorithm to return a 1 to 5 score for connection health.

#### Focus Tracker

The FocusTracker get a normalized 1 to 5 score for each connected video element and returns the
highest score as the metric value.

#### Other Future Trackers

In the future we might add more trackers or allow custom trackers for determining priority scores.
