import { start } from 'repl'
import { last, min } from 'rxjs/operators'
import { int, ms } from '../../../utils/type-aliases'
import { CameraArchive, ISimpleTimeRange, IRecord } from './ICamera'


export class BirdViewTree {
    constructor (
        protected _originalArchiveRange: ISimpleTimeRange,
        protected _originalArchive: CameraArchive = [],
    ) {
        if (_originalArchiveRange) {
            this._initTree()
        }
    }

    protected _treeRoot: BirdViewTreeNode

    protected _initTree () {
        this._treeRoot = new BirdViewTreeNode(
            this._originalArchiveRange.start,
            this._originalArchiveRange.end,
            Infinity,
             // the root should contain the single full-range record with no gaps,
            [ { ...this._originalArchiveRange }, ],
            this._zoomingRequiredCallback
        )
    }

    public getRecords (startMs: ms, endMs: ms, minGapMs: ms): CameraArchive {
        return this._treeRoot.getRecords(startMs, endMs, minGapMs)
    }

    protected _zoomingRequiredCallback = (node: BirdViewTreeNode, part: 'left' | 'right', minGapMs: ms) => {
        // console.log('_zoomingRequiredCallback', node.depth, minGapMs)
        const { records, perfect } = part === 'left'
            ? this._spareArchiveDetails(node.startMs, node.centerMs, minGapMs)
            : this._spareArchiveDetails(node.centerMs, node.endMs, minGapMs)
        node.setChild(part, minGapMs, records, perfect)
    }

    protected _binarySearchForArchiveSubRange (startMs: ms, endMs: ms) {
        let l = 0
        let r = this._originalArchive.length - 1
        let firstIndex = l // the first record to end after startMs
        let lastIndex = r // the last record to start before endMs

        // first records first
        while (l < r) {
            // console.log('F', l, r)
            const m = l + Math.round((r - l) / 2)
            const mRec = this._originalArchive[m]
            const prevRec = m > 0 ? this._originalArchive[m - 1] : null
            // console.log(l, r, m, mRec, prevRec)
            if (mRec.end > startMs) {
                if (!prevRec || prevRec.end < startMs) {
                    firstIndex = m
                    // console.log('found!', m)
                    break
                } else {
                    // console.log('going left')
                    r = (m === r) ? (r - 1) : m
                }
            } else {
                // console.log('going right')
                l = (m === l) ? (l + 1) : m
            }
        }

        l = 0
        r = this._originalArchive.length - 1
        // last records last
        while (l < r) {
            // console.log('L', l, r)
            const m = l + Math.round((r - l) / 2)
            const mRec = this._originalArchive[m]
            const nextRec = m < this._originalArchive.length - 1 ? this._originalArchive[m + 1] : null
            // console.log(l, r, m, mRec, prevRec)
            if (mRec.start < endMs) {
                if (!nextRec || nextRec.start > endMs) {
                    lastIndex = m
                    // console.log('found!', m)
                    break
                } else {
                    // console.log('going left')
                    r = (m === r) ? (r - 1) : m
                }
            } else {
                // console.log('going right')
                l = (m === l) ? (l + 1) : m
            }
        }

        return { firstIndex, lastIndex }

    }

    protected _undetalizeArchiveSubRange (firstIndex: int, lastIndex: int, minGapMs) {
        const records = []
        let lastAdded = undefined

        for (let i = firstIndex; i <= lastIndex; i++) {
            const r = this._originalArchive[i]
            if (!records.length) {
                lastAdded = {...r}
                records.push(lastAdded)
                continue
            }
            const gap = r.start - lastAdded.end
            if (gap < minGapMs) {
                lastAdded.end = r.end
            } else {
                lastAdded = {...r}
                records.push(lastAdded)
            }
        }

        return records
    }

    protected _spareArchiveDetails (startMs: ms, endMs: ms, minGapMs: ms) {

        // TODO: optimize (use binary search insted of linear map; spare detailization same time)

        const { firstIndex, lastIndex } = this._binarySearchForArchiveSubRange(startMs, endMs)

        const maxDetailizedLength = lastIndex - firstIndex + 1

        const records = this._undetalizeArchiveSubRange(firstIndex, lastIndex, minGapMs)

        const unDetailizedLength = records.length
        const perfect = maxDetailizedLength === unDetailizedLength
        // console.log(maxDetailizedLength, unDetailizedLength, perfect)
        return { records, perfect }

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

export class BirdViewTreeNode {

    protected _intervalCenterMs: ms

    public get startMs () {
        return this._startMs
    }

    public get endMs () {
        return this._endMs
    }

    public get centerMs () {
        return this._intervalCenterMs
    }

    public get depth () {
        return this._depth
    }

    constructor (
        protected _startMs: ms,
        protected _endMs: ms,
        protected _minGapMs: ms = Infinity,
        protected _records: CameraArchive = [],
        protected _zoomingRequiredCallback: Function = null,
        protected _isPerfect: boolean = false,
        protected _depth: int = 0,
        protected _parent: BirdViewTreeNode = null,
        protected _leftChild: BirdViewTreeNode = null,
        protected _rightChild: BirdViewTreeNode = null,
    ) {
        this._intervalCenterMs = this._startMs + (this._endMs - this._startMs) / 2
        // if (this._isPerfect) {
        //     console.log('perfection achieved at depth', this.depth)
        // }
    }

    public setChild (part: 'left' | 'right', minGapMs: ms, records: Array<IRecord>, perfect: boolean = false) {
        if (part === 'left' && this._leftChild) {
            console.warn('attempt to reset left child', this)
            return
        }
        if (part === 'right' && this._rightChild) {
            console.warn('attempt to reset right child', this)
            return
        }

        const startMs = part === 'left' ? this._startMs : this._intervalCenterMs
        const endMs = part === 'left' ? this._intervalCenterMs : this._endMs
        const child = new BirdViewTreeNode(
            startMs,
            endMs,
            minGapMs,
            records,
            this._zoomingRequiredCallback,
            perfect,
            this._depth + 1,
            this,
        )
        if (part === 'left') {
            this._leftChild = child
            // console.log('LEFT child SET', this, child)
        } else {
            this._rightChild = child
            // console.log('RIGHT child SET', this, child)
        }
    }

    public getRecords (startMs: ms, endMs: ms, minGapMs: ms): CameraArchive {
        // console.log('GR', this.depth, this._minGapMs, '|', startMs, endMs, minGapMs)
        if (startMs > this._endMs || endMs < this._startMs) {
            console.warn('BirdViewTree::getRecords miss')
            return []
        }

        // if (startMs < this._startMs) {
        //     startMs = this._startMs
        //     console.log('narrowed start')
        // }
        // if (endMs > this._endMs) {
        //     endMs = this._endMs
        //     console.log('narrowed end')
        // }


        if (!this._isPerfect && minGapMs < this._minGapMs) {
            let zoomingRequired = false
            let result = []

            const nextMinGap = this._minGapMs === Infinity ? minGapMs : this._minGapMs / 2
            // console.log('nextMinGap', nextMinGap)

            if (startMs < this._intervalCenterMs) {
                // should look into the left subtree or request building such
                if (!this._leftChild) {
                    // console.log('BirdViewTree::getRecords zooming required (LEFT)', this.depth, nextMinGap)
                    if (this._zoomingRequiredCallback) {
                        this._zoomingRequiredCallback(this, 'left', nextMinGap)
                    }

                    result = result.concat(this._records.filter(r => r.start < this._intervalCenterMs && r.end > startMs))
                } else {
                    result = result.concat(this._leftChild.getRecords(Math.max(this._startMs, startMs), this._intervalCenterMs, minGapMs))
                }
            }

            if (endMs > this._intervalCenterMs) {
                // should look into the right subtree or request building such
                if (!this._rightChild) {
                    // console.log('BirdViewTree::getRecords zooming required (RIGHT)', this.depth, nextMinGap)
                    if (this._zoomingRequiredCallback) {
                        this._zoomingRequiredCallback(this, 'right', nextMinGap)
                    }

                    result = result.concat(this._records.filter(r => r.start < endMs && r.end > this._intervalCenterMs))
                } else {
                    result = result.concat(this._rightChild.getRecords(this._intervalCenterMs, Math.min(this._endMs, endMs), minGapMs))
                }
            }
            return result
        } else {
            const result = this._records.filter(r => r.start < endMs && r.end > startMs)
            // console.log(this._isPerfect ? 'PERFECT' : 'GOOD ENOUGH', result.length, new Date(startMs), new Date(endMs), result)
            return result
        }
    }
}


export default BirdViewTree
