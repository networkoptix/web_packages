import { BehaviorSubject } from 'rxjs';

/**
 * This is currently used in StorageManager but I could see this being used elsewhere if we made it a little more generic.
 * Example would probably be in the ServerManager or if we updated NxSystem to function more like the manager classes.
 */
export class BaseManager {
    #serverId$ = new BehaviorSubject<string>(null);
    public serverId$ = this.#serverId$;

    /**
     * Getter and setter for serverId. Updating serverId triggers state update.
     */
    get serverId() {
        return this.#serverId$.value;
    }

    set serverId(id) {
        this.#serverId$.next(id);
    }

    constructor() {}
}
