import { BehaviorSubject, interval, Subject } from 'rxjs';
import { filter, startWith, switchMap, takeUntil, tap } from 'rxjs/operators';

import type { CustomClientAPI } from '@services/nx-cloud-api/custom-client-api';
import { PackageState, PackageStatus } from '@services/nx-cloud-api/nx-cloud-api.types';

export enum PackageProgress {
    STARTING,
    GENERATING,
    DOWNLOAD_READY,
    PACKAGE_ERROR,
}

export class PackageHandler {
    #done$ = new Subject<'done' | 'canceled'>();
    private downloadId: string;
    private downloadUrl = '';

    packageState = PackageProgress.STARTING;
    current = 0;
    total = 0;
    errors: string[] = [];
    #state$: BehaviorSubject<PackageHandler> = new BehaviorSubject(null);
    state$ = this.#state$.pipe(filter(state => !!state));

    #START = 0.15;

    cancelProcess = (): void => {
        this.#done$.next('canceled');
    };

    constructor(
        private id: string,
        generatePackage: CustomClientAPI['generatePackage'],
        checkPackageHandler: CustomClientAPI['checkPackage'],
        packageDownloadHandler: CustomClientAPI['getDownloadUrl'],
        private window: Window,
        notifyDownload = (downloadPath: string): void =>
            console.info(`Download ready: ${downloadPath}`),
        notifyError = console.error,
    ) {
        generatePackage(this.id)
            .pipe(
                switchMap(({ downloadId }) => {
                    this.packageState = PackageProgress.GENERATING;
                    this.total = 100;
                    this.current = 2;
                    this.downloadId = downloadId;
                    return interval(100).pipe(startWith(0));
                }),
                tap(_ => {
                    if (this.current < this.#START * this.total) {
                        this.current += 0.25;
                    }
                }),
                filter(iteration => iteration % 20 === 0 && iteration > 20),
                switchMap(_ => checkPackageHandler(this.id, this.downloadId)),
                startWith({
                    state: PackageState.PENDING,
                    total: 100,
                    current: 0,
                    errors: [],
                }),
                takeUntil(this.#done$),
            )
            .subscribe(({ state, total, current, errors }: PackageStatus) => {
                switch (state) {
                    case PackageState.READY:
                        this.packageState = PackageProgress.DOWNLOAD_READY;
                        this.total ||= 100;
                        this.current = this.total;
                        this.downloadUrl = packageDownloadHandler(this.id, this.downloadId);
                        notifyDownload(this.downloadUrl);
                        this.window.location.assign(this.downloadUrl);
                        this.#done$.next('done');
                        break;

                    case PackageState.FAILED:
                        this.packageState = PackageProgress.PACKAGE_ERROR;
                        this.errors = errors;
                        notifyError(errors);
                        this.#done$.next('done');
                        break;

                    case PackageState.PENDING:
                        this.packageState = PackageProgress.GENERATING;
                        this.current = Math.max(current, this.#START * this.total);
                        this.total = total;
                        break;

                    default:
                        this.packageState = PackageProgress.GENERATING;
                        this.current = this.#START * this.total;
                        this.total = 100;
                }
                this.#state$.next(this);
            });
    }
}
