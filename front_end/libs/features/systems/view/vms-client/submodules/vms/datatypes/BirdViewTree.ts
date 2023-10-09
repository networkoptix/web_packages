import { int, ms } from '@vms-client/utils/type-aliases';

import { TimeRangeUtils, newBaseTimeRange, BaseTimeRange } from './TimeRange';

function getNextRecord(archive: BaseTimeRange[], t: ms): BaseTimeRange | null {
    // binary search approach:
    let l = 0;
    let r = archive.length - 1;
    while (l < r) {
        const m = l + Math.floor((r - l) / 2);
        const rec = archive[m];
        const prevRec = m > 0 ? archive[m - 1] : null;
        if (rec.start >= t && (!prevRec || prevRec.end <= t)) {
            return rec;
        }
        if (rec.start > t) {
            r = m < r ? m : r - 1;
        } else {
            l = m > l ? m : l + 1;
        }
    }
    if (l === r && archive[l].start >= t) {
        return archive[l];
    }
    return null;

    // naive linear search approach:
    // return archive.find(r => r.start >= t)
}

export interface SubrangeIndicies {
    firstIndex: int;
    lastIndex: int;
}

// function simpleComparator(a, b, m) {
//     // if (typeof(a) === 'number')
//     //     return Math.sign(a - b)
//     return a === b ? 0 : a < b ? -1 : +1;
// }

function binarySearch<T>(
    haystack: T[],
    needle: number,
    comparator: (a: T, b: number, m: number) => number,
): number {
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
            l = m === l ? l + 1 : m;
        } else {
            // console.log('too big, going left')
            r = m === r ? r - 1 : m;
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
    private intervalCenterMs: ms;

    public get centerMs(): ms {
        return this.intervalCenterMs;
    }

    constructor(
        public startMs: ms,
        public endMs: ms,
        private minGapMs: ms = Infinity,
        private records: BaseTimeRange[] = [],
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        private zoomingRequiredCallback: BirdViewTree['zoomingRequiredCallback'] = null,
        private isPerfect: boolean = false,
        private depth: int = 0,
        private leftChild: BirdViewTreeNode = null,
        private rightChild: BirdViewTreeNode = null,
    ) {
        this.intervalCenterMs = this.startMs + (this.endMs - this.startMs) / 2;
        // if (this._isPerfect) {
        //     console.log('perfection achieved at depth', this.depth)
        // }
    }

    setChild(
        part: 'left' | 'right',
        minGapMs: ms,
        records: BaseTimeRange[],
        perfect: boolean = false,
    ): void {
        if (part === 'left' && this.leftChild) {
            console.warn('attempt to reset left child', this);
            return;
        }
        if (part === 'right' && this.rightChild) {
            console.warn('attempt to reset right child', this);
            return;
        }

        const startMs = part === 'left' ? this.startMs : this.intervalCenterMs;
        const endMs = part === 'left' ? this.intervalCenterMs : this.endMs;
        const child = new BirdViewTreeNode(
            startMs,
            endMs,
            minGapMs,
            records,
            this.zoomingRequiredCallback,
            perfect,
            this.depth + 1,
        );
        if (part === 'left') {
            this.leftChild = child;
            // console.log('LEFT child SET', this, child)
        } else {
            this.rightChild = child;
            // console.log('RIGHT child SET', this, child)
        }
    }

    private get archiveEnd(): ms {
        if (this.rightChild) {
            return this.rightChild.archiveEnd || this.records[this.records.length - 1]?.end;
        } else {
            return this.records[this.records.length - 1]?.end;
        }
    }

    getRecords(startMs: ms, endMs: ms, minGapMs: ms): BaseTimeRange[] {
        // console.log('GR', new Date(startMs), new Date(endMs))
        // console.log('GR', this.depth, this.startMs, this.endMs, '|',  this._minGapMs, '||', startMs, endMs, minGapMs)
        if (startMs > this.endMs || endMs < this.startMs) {
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

        if (!this.isPerfect && minGapMs < this.minGapMs) {
            // const zoomingRequired = false;
            let result: BaseTimeRange[] = [];

            const nextMinGap =
                this.minGapMs === Infinity ? minGapMs : Math.floor(this.minGapMs / 2);
            // console.log('nextMinGap', nextMinGap)

            if (startMs <= this.intervalCenterMs) {
                // should look into the left subtree or request building such
                if (!this.leftChild) {
                    // console.log('BirdViewTree::getRecords zooming required (LEFT)', this.depth, nextMinGap)
                    if (this.zoomingRequiredCallback) {
                        this.zoomingRequiredCallback(this, 'left', nextMinGap);
                    }

                    result = result.concat(
                        this.records.filter(r => r.start < endMs && r.end > startMs),
                    );
                } else {
                    result = result.concat(
                        this.leftChild.getRecords(
                            Math.max(this.startMs, startMs),
                            Math.min(endMs, this.intervalCenterMs),
                            minGapMs,
                        ),
                    );
                }
            }

            if (endMs > this.intervalCenterMs) {
                // should look into the right subtree or request building such
                if (!this.rightChild) {
                    // console.log('BirdViewTree::getRecords zooming required (RIGHT)', this.depth, nextMinGap)
                    if (this.zoomingRequiredCallback) {
                        this.zoomingRequiredCallback(this, 'right', nextMinGap);
                    }

                    result = result.concat(
                        this.records.filter(r => r.start < endMs && r.end > startMs),
                    );
                } else {
                    result = result.concat(
                        this.rightChild.getRecords(
                            Math.max(this.intervalCenterMs, startMs),
                            Math.min(this.endMs, endMs),
                            minGapMs,
                        ),
                    );
                }
            }

            return result;
        } else {
            const result = this.records.filter(r => r.start < endMs && r.end > startMs);
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
        private originalArchiveRange: BaseTimeRange,
        private originalArchive: BaseTimeRange[] = [],
    ) {
        if (originalArchiveRange) {
            this.initTree();
        }
    }

    private treeRoot: BirdViewTreeNode;
    private newlyRecorded: BaseTimeRange[] = [];

    private initTree(): void {
        this.treeRoot = new BirdViewTreeNode(
            this.originalArchiveRange.start,
            this.originalArchiveRange.end,
            Infinity,
            // the root should contain the single full-range record with no gaps,
            [{ ...this.originalArchiveRange }],
            this.zoomingRequiredCallback,
        );
    }

    isThereRecord(t: ms): boolean {
        return this.getRecords(t - 1, t + 1, 0).length > 0;
    }

    getNextRecord(t: ms): BaseTimeRange {
        return getNextRecord(this.originalArchive, t) || getNextRecord(this.newlyRecorded, t);
    }

    getRecords(startMs: ms, endMs: ms, minGapMs: ms): BaseTimeRange[] {
        if (startMs < this.originalArchiveRange.start) {
            if (endMs < this.originalArchiveRange.start) {
                console.warn('BirdViewTree::getRecords hard miss in the past');
            } else {
                // console.warn('BirdViewTree::getRecords soft miss in the past');
            }
            return [];
        }
        if (startMs < this.originalArchiveRange.start) {
            startMs = this.originalArchiveRange.start;
            // console.log('narrowed start')
        }
        const treeRecords =
            this.treeRoot?.getRecords(
                startMs,
                endMs > this.originalArchiveRange.end ? this.originalArchiveRange.end : endMs,
                minGapMs,
            ) || [];
        if (endMs > this.originalArchiveRange.end) {
            // console.log('GNRR', this.newlyRecorded, this.newlyRecorded.filter(r => r.start < endMs))
            this.newlyRecorded
                .filter(r => r.start < endMs)
                .forEach(r => {
                    treeRecords.push(r);
                });
        }
        return treeRecords;
    }

    setNewlyRecorded(ar: BaseTimeRange[]): void {
        this.newlyRecorded = [...ar];
    }

    // public appendNewlyRecorded(ar): void {
    //     this._newlyRecorded.push(...ar);
    // }

    private zoomingRequiredCallback = (
        node: BirdViewTreeNode,
        part: 'left' | 'right',
        minGapMs: ms,
    ): void => {
        // console.log('_zoomingRequiredCallback', node.depth, minGapMs, part, node.startMs, node.endMs)
        const { records, perfect } =
            part === 'left'
                ? this.spareArchiveDetails(node.startMs, node.centerMs, minGapMs)
                : this.spareArchiveDetails(node.centerMs, node.endMs, minGapMs);
        node.setChild(part, minGapMs, records, perfect);
    };

    private undetalizeArchiveSubRange(
        firstIndex: int,
        lastIndex: int,
        minGapMs: ms,
    ): BaseTimeRange[] {
        const records: BaseTimeRange[] = [];
        let lastAdded: BaseTimeRange;

        for (let i = firstIndex; i <= lastIndex; i++) {
            const r = this.originalArchive[i];
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

    private getSubrangeIndicies(sr: BaseTimeRange): SubrangeIndicies {
        if (TimeRangeUtils.contains(sr, this.originalArchiveRange)) {
            // console.log('contains');
            return {
                firstIndex: 0,
                lastIndex: this.originalArchive.length - 1,
            };
        }
        if (TimeRangeUtils.isDisjointWith(this.originalArchiveRange, sr)) {
            // console.log('no overlap');
            return {
                firstIndex: -1,
                lastIndex: -1,
            };
        }
        return {
            firstIndex: this.binarySearchForTheFirstSubrangeIndex(sr.start),
            lastIndex: this.binarySearchForTheLastSubrangeIndex(sr.end),
        };
    }

    private binarySearchForTheFirstSubrangeIndex(subrangeStart: ms): int {
        return binarySearch(this.originalArchive, subrangeStart, (record, needle, i) => {
            // needle ===def=== subrangeStart
            const prev = i >= 1 ? this.originalArchive[i - 1] : null;
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
                return record.end > needle && record.start < this.originalArchiveRange.end ? 0 : -1;
            }
        });
    }

    private binarySearchForTheLastSubrangeIndex(subrangeEnd: ms): int {
        return binarySearch(this.originalArchive, subrangeEnd, (record, needle, i) => {
            // needle ===def=== subrangeEnd
            const next = i <= this.originalArchive.length - 2 ? this.originalArchive[i + 1] : null;
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
                return record.start < needle && record.end > this.originalArchiveRange.start
                    ? 0
                    : +1;
            }
        });
    }

    private spareArchiveDetails(
        startMs: ms,
        endMs: ms,
        minGapMs: ms,
    ): { records: BaseTimeRange[]; perfect: boolean } {
        // TODO: optimize (use binary search insted of linear map; spare detailization same time)

        const { firstIndex, lastIndex } = this.getSubrangeIndicies(
            newBaseTimeRange(startMs, endMs),
        );
        // this._binarySearchForArchiveSubRange(startMs, endMs)

        const maxDetailizedLength = lastIndex - firstIndex + 1;

        const records = this.undetalizeArchiveSubRange(firstIndex, lastIndex, minGapMs);

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
