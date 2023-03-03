export interface PersistentInfo {
    persistentInfo: {
        dbID: string;
        sequence: number;
        timestamp: {
            sequence: string;
            ticks: string;
        };
    };
}
