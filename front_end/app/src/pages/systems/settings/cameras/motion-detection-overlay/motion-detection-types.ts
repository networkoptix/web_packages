export type SensitivityColor = '#FFFFFF' | '#627CD6' | '#23A4CB' | '#31BAA2' | '#79BC66' | '#B8BC37' | '#FBA405' | '#E97119' | '#D24729' | '#C22626';
export type Cell = number;
export type Row = Cell[];
export type Mask = Row[];
export type AreaTuple = [number, number, number, number, number];
export class Area {
    constructor(public sensitivity: number, public x: number, public y: number, public width: number, public height: number, public currentSelection?: boolean) { }
    public borders(zone: Area) {
        if (this.sensitivity !== zone.sensitivity) return false;
        return !(this.x + this.width + 1 <= zone.x ||
            this.y + this.height + 1 <= zone.y ||
            this.x - 1 >= zone.x + zone.width ||
            this.y - 1 >= zone.y + zone.height);
    }
}
