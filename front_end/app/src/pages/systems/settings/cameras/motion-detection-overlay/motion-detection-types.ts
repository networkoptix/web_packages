export type SelectionAction = 'double-click' | 'click' | 'select-start' | 'select-end' | 'filter';
export type Cell = number;
export type Row = Cell[];
export type Mask = Row[];
export type AreaTuple = [number, number, number, number, number];

export class Area {
    constructor(
        public sensitivity: number,
        public x: number,
        public y: number,
        public width: number,
        public height: number,
        public currentSelection?: boolean
    ) { }

    /**
     * Finds if area borders another area
     * @param zone zone to check against
     */
    public borders(zone: Area): boolean {
        if (this.sensitivity !== zone.sensitivity) return false;
        return !(this.x + this.width + 1 <= zone.x ||
            this.y + this.height + 1 <= zone.y ||
            this.x - 1 >= zone.x + zone.width ||
            this.y - 1 >= zone.y + zone.height);
    }

    /**
     * Find if coordinates x y are within area. Might add overload on this method for selecting multiple zones.
     * @param x
     * @param y
     */
    public surrounds(x: number, y: number): boolean {
        const endX = this.x + this.width;
        const endY = this.y + this.height;
        return this.x <= x && x <= endX && this.y <= y && y <= endY;
    }
}
