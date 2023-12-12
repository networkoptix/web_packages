import { ElementRef } from '@angular/core';
import {
    BehaviorSubject,
    Subscription,
    merge,
    fromEvent,
    Subject,
    EMPTY,
    animationFrameScheduler,
    Observable,
} from 'rxjs';
import {
    switchMap,
    pairwise,
    throttleTime,
    filter,
    distinctUntilChanged,
    map,
    startWith,
    tap,
    buffer,
    withLatestFrom,
    takeUntil,
    delay,
    merge as mergeOperator,
} from 'rxjs/operators';

import { MotionMaskState } from './MotionMaskState';
import { Mask, Area } from './motion-detection-types';

enum ActionType {
    Click = 'click',
    DoubleClick = 'double-click',
    SelectStart = 'select-start',
    SelectEnd = 'select-end',
}

export class MotionMaskRenderer {
    private cellWidth: number;
    private cellHeight: number;
    private height: number;
    private width: number;
    private ctx: CanvasRenderingContext2D;
    private maskZones: BehaviorSubject<Area[]>;
    private selectionZones: BehaviorSubject<Area[]>;
    public canvas: ElementRef<HTMLCanvasElement>;
    public selectionCanvas: ElementRef<HTMLCanvasElement>;
    private selectionCtx: CanvasRenderingContext2D;
    public renderer: Subscription;
    public selectionRenderer: Subscription;
    public interactions: Subscription;
    private brandColor: string;

    public columns = MotionMaskState.matrixColumns;
    public rows = MotionMaskState.matrixRows;

    constructor(
        private motionMask: MotionMaskState,
        private sensitivityColors: string[],
        private unsub$: Subject<boolean>,
        private sensitivityButtons$: BehaviorSubject<number | boolean | 'reset'>,
        private isMobile: boolean,
    ) {
        this.motionMask.maskMatrix.pipe(takeUntil(this.unsub$)).subscribe(matrix => {
            const columns = matrix[0].length;
            const rows = matrix.length;

            if (rows !== this.rows && columns !== this.columns) {
                this.columns = columns;
                this.rows = rows;
            }
        });
    }

    // Init methods
    public initCanvas = (
        canvas: ElementRef<HTMLCanvasElement>,
        selectionCanvas: ElementRef<HTMLCanvasElement>,
    ): void => {
        const canvasWidth = canvas.nativeElement.width / 2;
        const canvasHeight = canvas.nativeElement.height / 2;
        this.cellWidth = canvasWidth / this.columns;
        this.cellHeight = canvasHeight / this.rows;
        this.width = canvasWidth;
        this.height = canvasHeight;
        this.ctx = canvas.nativeElement.getContext('2d');
        this.selectionCtx = selectionCanvas.nativeElement.getContext('2d');
        this.ctx.scale(2, 2);
        this.selectionCtx.scale(2, 2);
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.translate(-0.5, -0.5);
        this.selectionCtx.imageSmoothingEnabled = false;
        this.selectionCtx.translate(-0.5, -0.5);
        this.maskZones = this.motionMask.maskZones;
        this.selectionZones = this.motionMask.selectionZones;
        this.brandColor = getComputedStyle(canvas.nativeElement).color;
        this.initInteractions(canvas.nativeElement);
        this.renderer = this.maskZones.pipe(takeUntil(this.unsub$)).subscribe(maskZones => {
            this.updateRenderMask(maskZones);
        });
        this.selectionRenderer = this.selectionZones
            .pipe(takeUntil(this.unsub$))
            .subscribe(selectionZones => {
                this.updateSelection(selectionZones);
            });
    };

    /**
     * This initialization method could probably be broken down more in the future.
     * @param canvas ref for target canvas
     */
    private initInteractions(canvas: HTMLCanvasElement): void {
        this.brandColor = getComputedStyle(canvas).color;

        // Initialize base observables from events ... unless we're on mobile device (CLOUD-6752)
        const track = (eventName: string): Observable<MouseEvent> =>
            this.isMobile ? EMPTY : fromEvent<MouseEvent>(canvas, eventName);
        const [mouseDown$, mouseUp$, mouseLeave$, mouseMove$] = [
            'mousedown',
            'mouseup',
            'mouseleave',
            'mousemove',
        ].map(track);

        const [keyDown$, keyUp$] = ['keydown', 'keyup'].map(event =>
            this.isMobile ? EMPTY : fromEvent<KeyboardEvent>(window, event),
        );

        // Utility functions
        const findEventCoords = (event: MouseEvent): { x: number; y: number } => {
            const rect = canvas.getBoundingClientRect();
            const cellActualWidth = rect.width / this.columns;
            const cellActualHeight = rect.height / this.rows;
            return {
                x: Math.floor((event.clientX - rect.left) / cellActualWidth),
                y: Math.floor((event.clientY - rect.top) / cellActualHeight),
            };
        };

        const getAction = (buffer: { type: string; x: number; y: number }[]): ActionType => {
            buffer = buffer.filter(({ type }) => type !== null);
            const firstClick =
                buffer.length >= 2 &&
                buffer[0].type === 'mousedown' &&
                buffer[1].type === 'mouseup';
            const doubleClick =
                buffer.length >= 4 &&
                firstClick &&
                buffer[2].type === 'mousedown' &&
                buffer[3].type === 'mouseup';
            const click = firstClick;
            const start = buffer[0] && buffer[0].type === 'mousedown';
            if (doubleClick) {
                return ActionType.DoubleClick;
            }
            if (click) {
                return ActionType.Click;
            }
            if (start) {
                return ActionType.SelectStart;
            }
            return ActionType.SelectEnd;
        };
        // Base observables for managing UI state
        const shiftCtrlSubject$ = new BehaviorSubject({
            ctrlKey: false,
            shiftKey: false,
        });
        merge(keyDown$, keyUp$)
            .pipe(
                filter(({ key }) => key === 'Control' || key === 'Shift'),
                map(({ ctrlKey, shiftKey }) => ({ ctrlKey, shiftKey })),
                distinctUntilChanged(
                    (x, y) => x.ctrlKey === y.ctrlKey && x.shiftKey === y.shiftKey,
                ),
                takeUntil(this.unsub$),
            )
            .subscribe(shiftCtrlSubject$);
        const mouseState$ = new BehaviorSubject({ x: 0, y: 0 });
        mouseMove$
            .pipe(
                throttleTime(0, animationFrameScheduler),
                map(findEventCoords),
                distinctUntilChanged(
                    ({ x: prevX, y: prevY }, { x, y }) => prevX === x && prevY === y,
                ),
                mergeOperator(
                    this.sensitivityButtons$.pipe(
                        filter(value => value === 'reset'),
                        map(() => ({ x: 0, y: 0 })),
                    ),
                ),
                takeUntil(this.unsub$),
            )
            .subscribe(mouseState$);
        const clickAction$ = merge(mouseDown$, mouseUp$, mouseLeave$);
        const clickBuffer$ = clickAction$.pipe(delay(0));

        const initialHover = mouseState$
            .pipe(
                tap(({ x, y }) => this.drawHoverOrSelection({ x, y, height: 1, width: 1 })),
                takeUntil(this.unsub$),
            )
            .subscribe();

        clickAction$
            .pipe(
                startWith({ type: null, x: 0, y: 0 }),
                tap(({ type }) => {
                    if (type !== null) {
                        initialHover.unsubscribe();
                    }
                }),
                buffer(clickBuffer$.pipe(startWith({ type: 'mouse-leave', x: 0, y: 0 }))),
                withLatestFrom(mouseState$.pipe(startWith({ x: 0, y: 0 }))),
                map(([buffer, { x, y }]) => ({
                    action: getAction(buffer),
                    x,
                    y,
                    ...shiftCtrlSubject$.value,
                })),
                pairwise(),
                filter(
                    ([prev, cur]) =>
                        !(
                            prev.action === ActionType.SelectEnd &&
                            cur.action === ActionType.SelectEnd
                        ),
                ),
                map(([prev, { action, x: curX, y: curY, ...keyStates }]) => {
                    let width = 1;
                    let height = 1;
                    const x = Math.max(Math.min(curX, prev.x), 0);
                    const y = Math.max(Math.min(curY, prev.y), 0);
                    if (action === ActionType.SelectEnd) {
                        width = Math.max(curX, prev.x) - Math.min(Math.max(curX, 0), prev.x) + 1;
                        height = Math.max(curY, prev.y) - Math.min(Math.max(curY, 0), prev.y) + 1;
                    }
                    return {
                        action,
                        x,
                        y,
                        selectX: Math.max(curX, 0),
                        selectY: Math.max(curY, 0),
                        width,
                        height,
                        ...keyStates,
                    };
                }),
                switchMap(
                    ({ action, x, y, selectX, selectY, ctrlKey, shiftKey, width, height }) => {
                        const prevSelections = this.selectionZones.value;
                        const newZone = new Area(150, x, y, width, height, true);
                        if (action === ActionType.SelectStart) {
                            if (!shiftKey && !ctrlKey) {
                                this.selectionZones.next([]);
                            }
                            return mouseState$.pipe(
                                tap(({ x: mouseX, y: mouseY }) => {
                                    const x = Math.min(selectX, mouseX);
                                    const y = Math.min(selectY, mouseY);
                                    width = Math.max(selectX, mouseX) - x + 1;
                                    height = Math.max(selectY, mouseY) - y + 1;
                                    this.drawHoverOrSelection({
                                        x,
                                        y,
                                        height,
                                        width,
                                    });
                                }),
                            );
                        } else if (action === ActionType.SelectEnd) {
                            if (shiftKey) {
                                this.selectionZones.next([...prevSelections, newZone]);
                            } else if (ctrlKey) {
                                const matrix = this.motionMask.zonesToMatrix(prevSelections);
                                const updatedMatrix = this.motionMask.addZone(
                                    newZone,
                                    matrix,
                                    true,
                                );
                                const updatedZones = this.motionMask
                                    .matrixToZones(updatedMatrix)
                                    .filter(({ sensitivity }) => sensitivity >= 150);
                                this.selectionZones.next(updatedZones);
                            } else {
                                this.selectionZones.next([newZone]);
                            }
                        }
                        return mouseState$.pipe(
                            startWith(mouseState$.value),
                            tap(({ x, y }) =>
                                this.drawHoverOrSelection({
                                    x,
                                    y,
                                    height: 1,
                                    width: 1,
                                }),
                            ),
                            takeUntil(this.unsub$),
                        );
                    },
                ),
            )
            .subscribe();
    }

    // Render methods
    /**
     * Cached render instructions
     */
    maskRenderInstructions: (() => void)[] = [];

    selectionRenderInstructions: (() => void)[] = [];

    /**
     * Adds fill color for each cell
     */
    private fillZones = (maskZones: Area[]): void => {
        const selectedFill = '#33333377';
        maskZones.forEach(({ sensitivity, x, y, width, height }) => {
            const instruction = (): void => {
                this.ctx.beginPath();
                this.ctx.fillStyle =
                    sensitivity >= 150 ? selectedFill : this.sensitivityColors[sensitivity] + '55';
                this.ctx.rect(
                    x * this.cellWidth,
                    y * this.cellHeight,
                    width * this.cellWidth,
                    height * this.cellHeight,
                );
                this.ctx.fill();
            };

            this.maskRenderInstructions.push(instruction);
        });
    };

    /**
     * Iterates through cells and draws outline for each
     */
    private drawCells = (
        currentMatrix = this.motionMask.maskMatrix.value,
        ctx = this.ctx,
        renderInstructions = this.maskRenderInstructions,
        onlySelection = false,
        shadow = false,
    ): void => {
        const instruction = (): void => {
            ctx.lineWidth = 1;
        };
        renderInstructions.push(instruction);
        currentMatrix.forEach((_, row) =>
            _.forEach(
                this.drawCell(currentMatrix, row, ctx, renderInstructions, onlySelection, shadow),
            ),
        );
    };

    /**
     * Draw cell borders, black for zone edges, brand color for selection edges, light gray for grid.
     */
    private drawCell =
        (
            maskMatrix: Mask,
            row: number,
            ctx = this.ctx,
            renderInstructions = this.maskRenderInstructions,
            onlySelection = false,
            shadow = false,
        ) =>
        (sensitivity: number, column: number) => {
            // add check here for if border should be
            const top = row * this.cellHeight;
            const bottom = (row + 1) * this.cellHeight;
            const left = column * this.cellWidth;
            const right = (column + 1) * this.cellWidth;
            const drawRight =
                column !== this.columns - 1 && sensitivity !== maskMatrix[row][column + 1];
            const drawBottom = row !== this.rows - 1 && sensitivity !== maskMatrix[row + 1][column];
            const draw = (
                fromY: number,
                fromX: number,
                toY: number,
                toX: number,
                solid: boolean,
                sensitivity = 0,
                shadow = false,
            ): void => {
                if (onlySelection && !solid) {
                    return;
                }

                const horizontal = fromY === toY;
                const white10Percent = '#FFFFFF1A';
                const black20Percent = '#00000033';
                const selected = sensitivity >= 100;
                const color = shadow
                    ? black20Percent
                    : solid
                      ? selected
                          ? this.brandColor
                          : 'black'
                      : white10Percent;

                const instruction = (): void => {
                    ctx.strokeStyle = color;
                    ctx.lineWidth = shadow ? 3.5 : selected ? 2 : 1;
                    ctx.beginPath();
                    ctx.moveTo(
                        !horizontal && selected ? fromX + 0.5 : fromX,
                        selected ? fromY + 0.5 : fromY,
                    );
                    ctx.lineTo(
                        horizontal && color === white10Percent
                            ? toX - 1
                            : !horizontal && selected
                              ? toX + 0.5
                              : toX,
                        !horizontal && [white10Percent, black20Percent].includes(color)
                            ? toY - (color === white10Percent ? 1 : 0.5)
                            : selected
                              ? toY + 0.5
                              : toY,
                    );
                    ctx.stroke();
                };
                renderInstructions.push(instruction);
            };
            draw(
                bottom,
                right + 0.5,
                bottom,
                left + 0.5,
                drawBottom,
                Math.max(maskMatrix[Math.min(row + 1, this.rows - 1)][column], sensitivity),
                shadow,
            );
            draw(
                top + (drawRight ? -0.5 : 0.5),
                right,
                bottom + 0.5,
                right,
                drawRight,
                Math.max(maskMatrix[row][Math.min(column + 1, this.columns - 1)], sensitivity),
                shadow,
            );
        };

    /**
     * Add numbers to the top left most cell in a zone
     */
    private addNumbers = (maskZones: Area[]): void => {
        const { findStartZones } = this.motionMask;
        const startZones = findStartZones(maskZones);
        const instruction = (): void => {
            const fontSize = 13;
            this.ctx.textAlign = 'center';
            this.ctx.font = `${fontSize}px sans-serif`;
            this.ctx.fillStyle = 'white';
            this.ctx.shadowColor = 'black';
            this.ctx.shadowBlur = 6;
        };
        this.maskRenderInstructions.push(instruction);
        startZones.forEach(({ x, y, width, height, sensitivity }) => {
            if (sensitivity >= 150) {
                return;
            }
            const addOffsetX = width >= 2 ? this.cellWidth / 2 : 0;
            const addOffsetY = height >= 2 ? this.cellHeight / 2 : 0;
            this.maskRenderInstructions.push(() => {
                this.ctx.fillText(
                    `${sensitivity || '0'}`,
                    (x + 0.5) * this.cellWidth + addOffsetX,
                    (y + 1) * this.cellHeight - 2 + addOffsetY,
                );
            });
        });
        this.maskRenderInstructions.push(() => {
            this.ctx.shadowBlur = 0;
        });
    };

    /**
     * Hover and selection outline
     */
    private drawHoverOrSelection = (cursor: {
        x: number;
        y: number;
        width: number;
        height: number;
    }): void => {
        const { x, y, width, height } = {
            x: cursor.x * this.cellWidth,
            y: cursor.y * this.cellHeight,
            width: cursor.width * this.cellWidth,
            height: cursor.height * this.cellHeight,
        };
        this.selectionCtx.clearRect(0, 0, this.width, this.height);
        this.renderSelection();
        this.selectionCtx.lineWidth = 1;
        this.selectionCtx.strokeStyle = this.brandColor;
        this.selectionCtx.strokeRect(x, y, width, height);
    };

    /**
     * Triggered on each state change
     */
    private updateRenderMask = (maskZones: Area[]): void => {
        this.maskRenderInstructions.push(() => this.ctx.clearRect(0, 0, this.width, this.height));
        this.fillZones(maskZones);
        this.addNumbers(maskZones);
        this.drawCells();
        this.renderMask();
        this.maskRenderInstructions.push(() =>
            this.selectionCtx.clearRect(0, 0, this.width, this.height),
        );
    };

    private renderMask = (): void => {
        this.maskRenderInstructions.forEach(instruction => instruction());
    };

    private updateSelection = (selectionZones: Area[]): void => {
        this.selectionRenderInstructions.push(() =>
            this.selectionCtx.clearRect(0, 0, this.width, this.height),
        );
        // Draw the selection area shadows
        this.drawCells(
            this.motionMask.zonesToMatrix(selectionZones),
            this.selectionCtx,
            this.selectionRenderInstructions,
            true,
            true,
        );
        // Draw the selection area outline
        this.drawCells(
            this.motionMask.zonesToMatrix(selectionZones),
            this.selectionCtx,
            this.selectionRenderInstructions,
            true,
        );
    };

    private renderSelection = (): void => {
        this.selectionRenderInstructions.forEach(instruction => instruction());
    };
}
