import { wrap } from 'comlink';

import { workerMethods } from '@utils/web-workers/partials/example';
import { createWorkerPool, defineWorker } from '@utils/web-workers/utils';
const wrappedWorkerMethods = defineWorker(workerMethods);

type WorkerMethods = typeof wrappedWorkerMethods;

// @ts-expect-error yeah yeah
const isWorker = typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope;

export const workerPool = isWorker
    ? undefined
    : createWorkerPool(() =>
          wrap<WorkerMethods>(new Worker(new URL('./app.worker', import.meta.url))),
      );

let lockInterval = setInterval(() => {}, 10_000);

if (!isWorker) {
    // @ts-expect-error yeah yeah
    window.startThreads = () => {
        clearInterval(lockInterval);
        lockInterval = setInterval(() => {
            workerPool?.lockThread(60_000);
        }, 100);
    };

    // @ts-expect-error yeah yeah
    window.stopThreads = () => {
        clearInterval(lockInterval);
    };
}
