export interface TreeItem {
    id: string;
    name: string;
    level: number;
}

export interface SelectedFolder {
    /** Id of org/group */
    folder: string;
    /** null if folder is org, otherwise ancestors going up */
    parents: string[] | null;
}
