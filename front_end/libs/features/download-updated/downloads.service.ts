import { Injectable, signal } from '@angular/core';

@Injectable()
export class DownloadsService {
    type$$ = signal('');
    platform$$ = signal('');
}
