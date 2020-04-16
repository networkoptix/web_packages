import { ElementRef, EventEmitter } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { Mask, Area, AreaTuple }    from './motion-detection-types';
import { takeUntil, skip }          from 'rxjs/operators';

export class MotionMaskState {
    private columns = 44;
    private rows = 32;
    public maskMatrix: BehaviorSubject<Mask>;
    public maskZones: BehaviorSubject<Area[][]>;
    public selectionZones: BehaviorSubject<Area[]> = new BehaviorSubject([]);
    public renderState$: BehaviorSubject<{
        zones: Area[];
        maskMatrix: Mask;
    }> = new BehaviorSubject({ zones: [], maskMatrix: [] });

    constructor(
        initialMask: string,
        public canvas: ElementRef<HTMLCanvasElement>,
        public sensitivityButtons$: BehaviorSubject<boolean | number | 'reset'>,
        private unsub$: Subject<boolean>,
        updateMask: EventEmitter<string>
    ) {
        const parsedInitial = this.initialToMaskZones(initialMask);
        this.maskZones = new BehaviorSubject([parsedInitial]);
        this.maskMatrix = new BehaviorSubject(
            this.zonesToMatrix(parsedInitial)
        );

        this.maskZones.pipe(skip(1), takeUntil(unsub$)).subscribe(zones => {
            const matrix = this.zonesToMatrix(zones[zones.length - 1]);
            const latestZones = this.matrixToZones(matrix);
            const maskString = latestZones.map(
                ({ sensitivity, x, y, width, height }) => `${sensitivity},${x},${y},${width},${height}`
            ).join(';');
            updateMask.emit(maskString);
        });
        this.initSensitivityButtons();
    }

    /**
     * Call this method to update mask on route changes.
     * @param mask initial mask from server
     */
    public reInitialize(mask: string) {
        const parsedInitial = this.initialToMaskZones(mask);
        this.maskZones.next([parsedInitial]);
        this.maskMatrix.next(this.zonesToMatrix(parsedInitial));
    }

    // Init Methods
    private initialToMaskZones(initial: string): Area[] {
        const zones = initial.split(';').map((area) => {
            const areaTuples = <AreaTuple>(
                area.split(',').map((numString) => parseInt(numString))
            );
            return new Area(...areaTuples);
        });
        return this.sortedZones(zones);
    }

    initSensitivityButtons = () => {
        this.selectionZones.pipe(takeUntil(this.unsub$)).subscribe((zones) => {
            if (zones.length && this.sensitivityButtons$.value === false) {
                this.sensitivityButtons$.next(!!zones.length);
            }
        });
        this.sensitivityButtons$
            .pipe(takeUntil(this.unsub$))
            .subscribe((sensitivity) => {
                const selection = this.selectionZones.value;
                if (typeof sensitivity === 'number') {
                    const updatedZones = selection.map((area) => {
                        area.sensitivity = sensitivity;
                        area.currentSelection = false;
                        return area;
                    });
                    const [
                        currentZones,
                        ...prevZones
                    ] = this.maskZones.value.reverse();
                    this.maskZones.next([
                        ...prevZones,
                        [...currentZones, ...updatedZones]
                    ]);
                    this.selectionZones.next([]);
                    this.sensitivityButtons$.next(false);
                } else if (sensitivity === 'reset') {
                    this.selectionZones.next([]);
                    this.sensitivityButtons$.next(false);
                }
            });
    };

    // State transform methods
    public mergeZones(
        currentZones: Area[],
        selectionZones: Area[]
    ): {
        maskMatrix: Mask;
        zones: Area[];
    } {
        const maskMatrix = this.zonesToMatrix([
            ...currentZones,
            ...selectionZones
        ]);
        const zones = this.matrixToZones(maskMatrix);
        return { maskMatrix, zones };
    }

    /**
     * Currently used to trigger first render. Could probably refactor this in the future.
     */
    public updateRenderState() {
        this.renderState$.next(
            this.mergeZones(
                this.maskZones.value[this.maskZones.value.length - 1],
                this.selectionZones.value
            )
        );
    }

    public get renderState() {
        return this.renderState$.value;
    }

    // Transform utilities
    public zonesToMatrix(zones: Area[]): Mask {
        let matrix: Mask = new Array(32).fill(new Array(44).fill(0));
        for (const zone of zones) {
            matrix = this.addZone(zone, matrix);
        }
        return matrix;
    }

    public matrixToZones(maskMatrix: Mask): Area[] {
        const matrix = <(number | false)[][]>(
            [...maskMatrix].map((row) => [...row])
        );
        const zones: Area[] = [];
        const updateZones = (row: number, column: number, sensitivity) => {
            let width = 1;
            let height = 1;
            while (
                column + width < this.columns &&
                matrix[row][column + width] === sensitivity
            ) {
                // Find row with matching sensitivity
                matrix[row][column + width] = false;
                width++;
            }
            while (
                row + height < this.rows &&
                matrix[row + height]
                    .slice(column, column + width)
                    .every((cell) => cell !== false && cell === sensitivity)
            ) {
                // Find height where sensitivity still matches for all cells
                for (let x = column; x < column + width; x++) {
                    matrix[row + height][x] = false;
                }
                height++;
            }
            zones.push(new Area(sensitivity, column, row, width, height, sensitivity >= 100));
        };
        matrix.forEach((_, row) => {
            _.forEach((_, column) => {
                if (matrix[row][column] !== false) {
                    updateZones(row, column, maskMatrix[row][column]);
                }
            });
        });
        return zones;
    }

    public addZone(zone: Area, mask: Mask, toggle = false): Mask {
        const maskCopy = [...mask.map((row) => [...row])];
        const { sensitivity, x, y, width, height, currentSelection } = zone;
        for (let row = y; row < y + height; row++) {
            for (let column = x; column < x + width; column++) {
                if (toggle) {
                    maskCopy[row][column] =
                        maskCopy[row][column] >= 150 ? 0 : 150;
                } else {
                    maskCopy[row][column] = currentSelection
                        ? Math.min(sensitivity + 100, 150)
                        : sensitivity;
                }
            }
        }
        return maskCopy;
    }

    /**
     * Returns zones sorted top left to bottom right
     */
    public sortedZones(zones: Area[]): Area[] {
        return zones.sort((a, b) => a.y - b.y || a.x - b.x);
    }

    /**
     * Returns array representing contiguous areas representing one zone.
     */
    public findZoneGroups = (zones: Area[]): Area[][] => {
        let sorted: Area[] = this.sortedZones(zones);
        const zoneGroups: Area[][] = [];
        while (sorted.length) {
            const [first, ...rest] = sorted;
            let group = [first];
            sorted = rest;
            for (
                let groupPointer = 0;
                groupPointer < group.length;
                groupPointer++
            ) {
                const borderingZones = sorted.filter((zone) => zone.borders(group[groupPointer]));
                group = [...group, ...borderingZones];
                sorted = sorted.filter(
                    (zone) => !zone.borders(group[groupPointer])
                );
            }
            zoneGroups.push(group);
        }
        return zoneGroups;
    };

    public get zoneGroups() {
        const current = this.maskZones.value.pop();
        return this.findZoneGroups(current);
    }

    /**
     * Used for placing sensitivity number indicators.
     */
    public findStartZones = (zones: Area[]) =>
        this.findZoneGroups(zones).map((group) => group[0]);
}
