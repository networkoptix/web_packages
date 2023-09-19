import { Observable } from 'rxjs';

export type ExtractObservable<P> = P extends Observable<infer T> ? T : never;
