import { expose, Remote } from 'comlink';
import { BehaviorSubject, filter, firstValueFrom, map } from 'rxjs';

type WorkerReady = {
    workerReady: () => Promise<number>;
};

export const defineWorker = <T extends Record<string, (...args: unknown[]) => unknown>>(
    workerMethods: T,
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
) => {
    const workerBusy$ = new BehaviorSubject<boolean>(false);

    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    const wrapMethods = <T extends Record<string, (...args: unknown[]) => unknown>>(target: T) => {
        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
        const workerReady = () =>
            firstValueFrom(
                workerBusy$.pipe(
                    filter(busy => !busy),
                    map(() => performance.now()),
                ),
            );

        return new Proxy(target, {
            get: (target, prop: string) => {
                if (prop === 'workerReady') {
                    return workerReady;
                } else if (typeof target[prop] === 'function') {
                    return async (...args: unknown[]) => {
                        workerBusy$.next(true);
                        try {
                            const result = await target[prop](...args);
                            workerBusy$.next(false);
                            return result;
                        } catch (error) {
                            workerBusy$.next(false);
                            throw error;
                        }
                    };
                } else {
                    return Reflect.get(target, prop);
                }
            },
        }) as T & WorkerReady;
    };

    const wrappedWorkerMethods = wrapMethods(workerMethods);

    expose(wrappedWorkerMethods);
    return wrappedWorkerMethods;
};

function* createThreadPool<T extends Remote<unknown>>(
    createWorkerThread: () => T,
    concurrency = navigator.hardwareConcurrency,
): Generator<T> {
    concurrency = concurrency || 1;
    while (concurrency) {
        concurrency--;
        yield createWorkerThread();
    }
}

export const createWorkerPool = <T extends Remote<WorkerReady>>(
    createWorkerThread: () => T,
    initialConcurrency = navigator.hardwareConcurrency,
    maxConcurrency = navigator.hardwareConcurrency * 4,
): T => {
    const workerThreads = [...createThreadPool(createWorkerThread, initialConcurrency)];
    const reserveThreads: T[] = [];
    let tasksWaiting = 0;

    const initializeReserveThreads = (): void => {
        const maxReserveThreads = Math.max(
            Math.round(Math.min(maxConcurrency - workerThreads.length, initialConcurrency / 2)),
            0,
        );

        if (reserveThreads.length < maxReserveThreads) {
            const numberOfReserveThreadsToCreate = maxReserveThreads - reserveThreads.length;
            const newReserveThreads = [
                ...createThreadPool(createWorkerThread, numberOfReserveThreadsToCreate),
            ];
            reserveThreads.push(...newReserveThreads);

            Promise.allSettled(newReserveThreads.map(worker => worker.workerReady()));
        }
    };

    initializeReserveThreads();

    const getBusyWorkersCount = async (): Promise<number> => {
        const workerThreadsBusy = await Promise.all(
            workerThreads.map(worker =>
                Promise.race([
                    worker.workerReady().then(() => false),
                    new Promise<true>(resolve => setTimeout(() => resolve(true), 10)),
                ]),
            ),
        );

        return workerThreadsBusy.filter(Boolean).length;
    };

    setInterval(async () => {
        const workerThreadsBusy = await getBusyWorkersCount();
        console.info('Worker pool status:', {
            workerThreads: workerThreads.length,
            workerThreadsBusy,
            reserveThreads: reserveThreads.length,
            tasksWaiting,
        });
    }, 1000);

    return new Proxy(workerThreads[0], {
        get: (target, prop) => {
            initializeReserveThreads();
            if (prop === 'workerReady') {
                return () => Promise.allSettled(workerThreads.map(worker => worker.workerReady()));
            } else if (typeof target[prop] === 'function') {
                return async (...args: unknown[]) => {
                    initializeReserveThreads();
                    let workerReady = false;
                    let incrementBy = 0;
                    const updater = setTimeout(() => {
                        incrementBy = 1;
                        tasksWaiting++;
                    }, 25);
                    const workerThread = await Promise.race(
                        [...workerThreads, ...reserveThreads].map(async worker => {
                            const isReserveWorker = reserveThreads.includes(worker);
                            await worker.workerReady();

                            if (isReserveWorker && !workerReady) {
                                workerThreads.push(
                                    ...reserveThreads.splice(reserveThreads.indexOf(worker), 1),
                                );
                            }

                            workerReady = true;
                            return worker;
                        }),
                    );
                    clearTimeout(updater);
                    tasksWaiting -= incrementBy;
                    return workerThread[prop](...args);
                };
            } else {
                return Reflect.get(target, prop);
            }
        },
    });
};
