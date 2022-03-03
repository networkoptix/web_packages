export interface SystemTile { // extends NxSystemWithUserInfo {
    readonly id: string,
    readonly type: 'system';
    name: string;
    readonly ownerAccountEmail: string;
    readonly ownerFullName: string;
}

export class GroupTile {
    readonly type = 'group';

    constructor(
        public id: string,
        public name: string,
        public readonly groups: GroupTile[] = [],
        public readonly systems: SystemTile[] = [],
    ) {}

    get tiles(): Tile[] {
        return [...this.groups, ...this.systems];
    }

    addGroup(group: GroupTile): void {
        this.groups.push(group);
    }

    addSystem(system: SystemTile): void {
        this.systems.push(system);
    }
}

export type Tile = GroupTile | SystemTile;
