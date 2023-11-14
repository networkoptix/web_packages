import { Point } from '@angular/cdk/drag-drop';

import { LayoutItem } from '@services/system-api.types/layouts.types';

const enum Direction {
    RIGHT = 0,
    DOWN = 1,
    LEFT = 2,
    UP = 3,
}

export function* openSpotGenerator(existingItems: LayoutItem[], origin: Point): Generator<Point> {
    const hasCollision = ({ x, y }: Point): boolean =>
        existingItems.some(
            ({ top, bottom, left, right }) =>
                left < x + 1 && right > x && top < y + 1 && bottom > y,
        );

    let x = 0;
    let y = 0;
    let layer = 1;
    let leg: Direction = Direction.RIGHT;

    while (true) {
        const point = { x: x + origin.x, y: y + origin.y };

        if (!hasCollision(point)) {
            yield point;
        }

        switch (leg) {
            case Direction.RIGHT:
                x++;
                if (x === layer) {
                    leg++;
                }
                break;
            case Direction.DOWN:
                y++;
                if (y === layer) {
                    leg++;
                }
                break;
            case Direction.LEFT:
                x--;
                if (-x === layer) {
                    leg++;
                }
                break;
            case Direction.UP:
                y--;
                if (-y === layer) {
                    leg = 0;
                    layer++;
                }
                break;
        }
    }
}
