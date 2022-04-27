import { int, ms } from '@vms-client/utils/type-aliases';

import {
    CameraArchive,
    ISimpleTimeRange,
    IRecord,
    SimpleTimeRange
} from './ICamera';
import { _getNextRecord } from './utils';

export interface SubrangeIndicies {
    firstIndex: int,
    lastIndex: int,
}

function simpleComparator(a, b, m) {
    // if (typeof(a) === 'number')
    //     return Math.sign(a - b)
    return a === b ? 0 : a < b ? -1 : +1;
}

function binarySearch(haystack, needle, comparator = simpleComparator) {
    let l = 0;
    let r = haystack.length - 1;
    // console.log('<=== BS started', haystack, needle)
    while (l <= r) {
        const m = l + Math.ceil((r - l) / 2);
        const v = haystack[m];
        const comparison = comparator(v, needle, m);
        // console.log(haystack, needle, '|', l, m, r, v, comparison, represent(haystack, needle, l, m, r))
        if (comparison === 0) {
            // console.log('==>', v, 'found at', m)
            return m;
        } else if (comparison < 0) {
            // console.log('too small, going right')
            l = (m === l) ? l + 1 : m;
        } else {
            // console.log('too big, going left')
            r = (m === r) ? r - 1 : m;
        }
    }
    // if (l === r) {
    //     console.log('==> loop end, equality', l,  haystack[l] === needle ? 'found' : 'not found')
    //     return haystack[l] === needle
    // } else {
    // console.log('==> loop end, inequality, not found', l, r)
    return -1;
    // }
}

export class BirdViewTreeNode {
    protected _intervalCenterMs: ms;

    public get startMs() {
        return this._startMs;
    }

    public get endMs() {
        return this._endMs;
    }

    public get centerMs() {
        return this._intervalCenterMs;
    }

    public get depth() {
        return this._depth;
    }

    constructor(
            protected _startMs: ms,
            protected _endMs: ms,
            protected _minGapMs: ms = Infinity,
            protected _records: CameraArchive = [],
            protected _zoomingRequiredCallback: Function = null,
            protected _isPerfect: boolean = false,
            protected _depth: int = 0,
            protected _parent: BirdViewTreeNode = null,
            protected _leftChild: BirdViewTreeNode = null,
            protected _rightChild: BirdViewTreeNode = null
    ) {
        this._intervalCenterMs = this._startMs + (this._endMs - this._startMs) / 2;
        // if (this._isPerfect) {
        //     console.log('perfection achieved at depth', this.depth)
        // }
    }

    public setChild(
        part: 'left' | 'right',
        minGapMs: ms,
        records: Array<IRecord>,
        perfect: boolean = false
    ) {
        if (part === 'left' && this._leftChild) {
            console.warn('attempt to reset left child', this);
            return;
        }
        if (part === 'right' && this._rightChild) {
            console.warn('attempt to reset right child', this);
            return;
        }

        const startMs = part === 'left' ? this._startMs : this._intervalCenterMs;
        const endMs = part === 'left' ? this._intervalCenterMs : this._endMs;
        const child = new BirdViewTreeNode(
            startMs,
            endMs,
            minGapMs,
            records,
            this._zoomingRequiredCallback,
            perfect,
            this._depth + 1,
            this
        );
        if (part === 'left') {
            this._leftChild = child;
            // console.log('LEFT child SET', this, child)
        } else {
            this._rightChild = child;
            // console.log('RIGHT child SET', this, child)
        }
    }

    public get archiveEnd(): ms {
        if (this._rightChild) {
            return this._rightChild.archiveEnd ||
                this._records[this._records.length - 1]?.end;
        } else {
            return this._records[this._records.length - 1]?.end;
        }
    }

    public getRecords(startMs: ms, endMs: ms, minGapMs: ms): CameraArchive {
        // console.log('GR', new Date(startMs), new Date(endMs))
        // console.log('GR', this.depth, this.startMs, this.endMs, '|',  this._minGapMs, '||', startMs, endMs, minGapMs)
        if (startMs > this._endMs || endMs < this._startMs) {
            // console.warn('BirdViewTree::getRecords miss');
            return [];
        }

        // if (startMs < this._startMs) {
        //     startMs = this._startMs
        //     console.log('narrowed start')
        // }
        // if (endMs > this._endMs) {
        //     endMs = this._endMs
        //     console.log('narrowed end')
        // }

        if (!this._isPerfect && (minGapMs < this._minGapMs)) {
            // const zoomingRequired = false;
            let result = [];

            const nextMinGap = this._minGapMs === Infinity
                ? minGapMs
                : Math.floor(this._minGapMs / 2);
            // console.log('nextMinGap', nextMinGap)

            if (startMs <= this._intervalCenterMs) {
                // should look into the left subtree or request building such
                if (!this._leftChild) {
                    // console.log('BirdViewTree::getRecords zooming required (LEFT)', this.depth, nextMinGap)
                    if (this._zoomingRequiredCallback) {
                        this._zoomingRequiredCallback(this, 'left', nextMinGap);
                    }

                    result = result.concat(
                        this._records.filter(r => r.start < endMs && r.end > startMs)
                    );
                } else {
                    result = result.concat(
                        this._leftChild.getRecords(
                            Math.max(this._startMs, startMs),
                            Math.min(endMs, this._intervalCenterMs),
                            minGapMs
                        )
                    );
                }
            }

            if (endMs > this._intervalCenterMs) {
                // should look into the right subtree or request building such
                if (!this._rightChild) {
                    // console.log('BirdViewTree::getRecords zooming required (RIGHT)', this.depth, nextMinGap)
                    if (this._zoomingRequiredCallback) {
                        this._zoomingRequiredCallback(this, 'right', nextMinGap);
                    }

                    result = result.concat(
                        this._records.filter(r => r.start < endMs && r.end > startMs)
                    );
                } else {
                    result = result.concat(
                        this._rightChild.getRecords(
                            Math.max(this._intervalCenterMs, startMs),
                            Math.min(this._endMs, endMs),
                            minGapMs
                        )
                    );
                }
            }

            return result;
        } else {
            const result = this._records.filter(r => r.start < endMs && r.end > startMs);
            // if (this._isPerfect) {
            //     console.log('depth', this.depth, this._records.length, 'perfection', result.length, result[0], result[result.length - 1], '|', startMs, endMs)
            // }
            // console.log(this._isPerfect ? 'PERFECT' : 'GOOD ENOUGH', new Date(startMs), new Date(endMs),
            //     this._records.length === result.length, this._records.length, result.length)
            // console.log(this._isPerfect ? 'PERFECT' : 'GOOD ENOUGH', result.length, new Date(startMs), new Date(endMs), result)
            return result;
        }
    }
}

export class BirdViewTree {
    constructor(
            protected _originalArchiveRange: ISimpleTimeRange,
            protected _originalArchive: CameraArchive = []
    ) {
        if (_originalArchiveRange) {
            this._initTree();
        }
    }

    protected _treeRoot: BirdViewTreeNode;
    protected _newlyRecorded: CameraArchive = [];

    protected _initTree(): void {
        this._treeRoot = new BirdViewTreeNode(
            this._originalArchiveRange.start,
            this._originalArchiveRange.end,
            Infinity,
            // the root should contain the single full-range record with no gaps,
            [{ ...this._originalArchiveRange }],
            this._zoomingRequiredCallback
        );
    }

    public set newlyRecorded(nr: CameraArchive) {
        this._newlyRecorded = nr;
    }

    public get newlyRecorded() {
        return this._newlyRecorded;
    }

    public get archiveEnd(): ms {
        return this._treeRoot.archiveEnd;
    }

    public isThereRecord(t: ms) {
        return this.getRecords(t - 1, t + 1, 0).length > 0;
    }

    public getNextRecord(t: ms): ISimpleTimeRange {
        return _getNextRecord(this._originalArchive, t) ||
                _getNextRecord(this._newlyRecorded, t);
    }

    public getRecords(startMs: ms, endMs: ms, minGapMs: ms): CameraArchive {
        if (startMs < this._originalArchiveRange.start) {
            if (endMs < this._originalArchiveRange.start) {
                console.warn('BirdViewTree::getRecords hard miss in the past');
            } else {
                // console.warn('BirdViewTree::getRecords soft miss in the past');
            }
            return [];
        }
        if (startMs < this._originalArchiveRange.start) {
            startMs = this._originalArchiveRange.start;
            // console.log('narrowed start')
        }
        const treeRecords = this._treeRoot?.getRecords(
            startMs,
            endMs > this._originalArchiveRange.end ? this._originalArchiveRange.end : endMs,
            minGapMs
        ) || [];
        if (endMs > this._originalArchiveRange.end) {
            // console.log('GNRR', this.newlyRecorded, this.newlyRecorded.filter(r => r.start < endMs))
            this.newlyRecorded.filter(r => r.start < endMs).forEach(r => {
                treeRecords.push(r);
            });
        }
        return treeRecords;
    }

    public setNewlyRecorded(ar): void {
        this._newlyRecorded = [...ar];
    }

    public appendNewlyRecorded(ar): void {
        this._newlyRecorded.push(...ar);
    }

    protected _zoomingRequiredCallback = (
        node: BirdViewTreeNode,
        part: 'left' | 'right',
        minGapMs: ms
    ): void => {
        // console.log('_zoomingRequiredCallback', node.depth, minGapMs, part, node.startMs, node.endMs)
        const { records, perfect } = part === 'left'
            ? this._spareArchiveDetails(node.startMs, node.centerMs, minGapMs)
            : this._spareArchiveDetails(node.centerMs, node.endMs, minGapMs);
        node.setChild(part, minGapMs, records, perfect);
    };

    protected _undetalizeArchiveSubRange(firstIndex: int, lastIndex: int, minGapMs) {
        const records = [];
        let lastAdded;

        for (let i = firstIndex; i <= lastIndex; i++) {
            const r = this._originalArchive[i];
            if (!records.length) {
                lastAdded = { ...r };
                records.push(lastAdded);
                continue;
            }
            const gap = r.start - lastAdded.end;
            if (gap < minGapMs) {
                lastAdded.end = r.end;
            } else {
                lastAdded = { ...r };
                records.push(lastAdded);
            }
        }

        return records;
    }

    public getSubrangeIndicies(sr: ISimpleTimeRange): SubrangeIndicies {
        if (sr.contains(this._originalArchiveRange)) {
            console.log('contains');
            return {
                firstIndex: 0,
                lastIndex: this._originalArchive.length - 1
            };
        }
        if (this._originalArchiveRange.isDisjointWith(sr)) {
            console.log('no overlap');
            return {
                firstIndex: -1,
                lastIndex: -1
            };
        }
        return {
            firstIndex: this._binarySearchForTheFirstSubrangeIndex(sr.start),
            lastIndex: this._binarySearchForTheLastSubrangeIndex(sr.end)
        };
    }

    protected _binarySearchForTheFirstSubrangeIndex(subrangeStart: ms): int {
        return binarySearch(
            this._originalArchive,
            subrangeStart,
            (record: IRecord, needle: ms, i: int) => {
                // needle ===def=== subrangeStart
                const prev = i >= 1 ? this._originalArchive[i - 1] : null;
                // console.log('FIRST comparator', record, needle, i, prev)
                if (prev) {
                    if (record.end > needle) {
                        // console.log('A', prev.end > needle ? +1 : 0)
                        return prev.end > needle ? +1 : 0;
                    } else {
                        // console.log('B', -1)
                        return -1;
                    }
                } else {
                    // console.log('C', (record.end > needle && record.start < this._range.end) ? 0 : -1)
                    return (
                        record.end > needle &&
                        record.start < this._originalArchiveRange.end
                    )
                        ? 0
                        : -1;
                }
            }
        );
    }

    protected _binarySearchForTheLastSubrangeIndex(subrangeEnd: ms): int {
        return binarySearch(
            this._originalArchive,
            subrangeEnd,
            (record: IRecord, needle: ms, i: int) => {
                // needle ===def=== subrangeEnd
                const next = i <= this._originalArchive.length - 2
                    ? this._originalArchive[i + 1]
                    : null;
                // console.log('LAST comparator', record, needle, i, next)
                if (next) {
                    if (record.start < needle) {
                        // console.log('A', next.start < needle ? -1 : 0)
                        return next.start < needle ? -1 : 0;
                    } else {
                        // console.log('B', +1)
                        return +1;
                    }
                } else {
                    // console.log('C', (record.start < needle && record.end > this._range.start) ? 0 : +1)
                    return (
                        record.start < needle &&
                        record.end > this._originalArchiveRange.start
                    )
                        ? 0
                        : +1;
                }
            }
        );
    }

    protected _spareArchiveDetails(startMs: ms, endMs: ms, minGapMs: ms) {
        // TODO: optimize (use binary search insted of linear map; spare detailization same time)

        const { firstIndex, lastIndex } = this.getSubrangeIndicies(
            new SimpleTimeRange(startMs, endMs)
        );
        // this._binarySearchForArchiveSubRange(startMs, endMs)

        const maxDetailizedLength = lastIndex - firstIndex + 1;

        const records = this._undetalizeArchiveSubRange(
            firstIndex,
            lastIndex,
            minGapMs
        );

        const unDetailizedLength = records.length;
        const perfect = maxDetailizedLength === unDetailizedLength;
        // console.log(maxDetailizedLength, unDetailizedLength, perfect)
        return { records, perfect };

        // // fallback

        // const maxDetailized = this._originalArchive.filter(r => r.start < endMs && r.end > startMs)

        // const records = maxDetailized.reduce(
        //     (acc, r) => {
        //         if (!acc.length) return [{ ...r }]
        //         const last = acc[acc.length - 1]
        //         const gap = r.start - last.end
        //         if (gap < minGapMs) {
        //             last.end = r.end
        //         } else {
        //             acc.push({ ...r })
        //         }
        //         return acc
        //     },
        //     []
        // )
        // // console.log('sparing', startMs, endMs, minGapMs, '->', result.length, result)

        // // TODO: indicate leafs in order to prevent pointless zooming attempts
        // return { records, perfect: maxDetailized.length === records.length }
    }
}
