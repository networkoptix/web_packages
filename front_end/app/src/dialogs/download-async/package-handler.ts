import { BehaviorSubject, interval, Subject, Observable } from 'rxjs';
import { filter, startWith, switchMap, takeUntil, tap } from 'rxjs/operators';

import {
    PackageProgress,
    PackageState,
    PackageStatus
} from './download-async.component.types';

type DownloadId = string;

type GenerateHandler = <Id>(id: Id) => Observable<{ downloadId: DownloadId }>;

type CheckPackageHandler = (id, downloadId: DownloadId) => Observable<PackageStatus>;

type PackageDownloadHandler = (id, downloadId: DownloadId) => string;

export class PackageHandler {
    #done$ = new Subject<any>();
    downloadId: string;

    packageState = PackageProgress.STARTING;
    current = 0;
    total = 0;
    downloadUrl = '';
    errors = [];
    #state$: BehaviorSubject<PackageHandler> = new BehaviorSubject(null);
    state$ = this.#state$.pipe(filter(state => !!state));

    #START = 0.15;

    cancelProcess = (): void => {
        this.#done$.next('canceled');
    };

    constructor(
        private id: string | number,
        generatePackage: GenerateHandler,
        checkPackageHandler: CheckPackageHandler,
        packageDownloadHandler: PackageDownloadHandler,
        private window: Window,
        notifyDownload = downloadPath => console.info(
            `Download ready: ${downloadPath}`
        ),
        notifyError = errors => console.error(errors)
    ) {
        generatePackage(
            this.id
        ).pipe(
            switchMap(({ downloadId }) => {
                this.packageState = PackageProgress.GENERATING;
                this.total = 100;
                this.current = 2;
                this.downloadId = downloadId;
                return interval(100).pipe(startWith(0));
            }),
            tap(_ => {
                if (this.current < (this.#START * this.total)) {
                    this.current += 0.25;
                }
            }),
            filter(iteration => iteration % 20 === 0 && iteration > 20),
            switchMap(_ => checkPackageHandler(this.id, this.downloadId)),
            startWith({
                state: PackageState.PENDING,
                total: 100,
                current: 0,
                errors: []
            }),
            takeUntil(this.#done$)
        ).subscribe((
            { state, total, current, errors }: PackageStatus
        ) => {
            switch (state) {
                case PackageState.READY:
                    this.packageState = PackageProgress.DOWNLOAD_READY;
                    this.total ||= 100;
                    this.current = this.total;
                    this.downloadUrl = packageDownloadHandler(
                        this.id,
                        this.downloadId
                    );
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
