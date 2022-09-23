/*eslint-disable */
/* too many places to ignore ESLint */

import 'zone.js/node';

// this section need to be before express engine **********
const fs = require('fs');
const path = require('path');
const distFolder = join(process.cwd(), 'dist/authorization/browser');
const template = fs.readFileSync(path.join(distFolder, 'index.html')).toString();
const domino = require('domino');
const win = domino.createWindow(template.toString());

(global as any).window = win;
(global as any).document = win.document;
(global as any).Event = win.Event;
(global as any).HTMLElement = win.HTMLElement;
(global as any).KeyboardEvent = win.KeyboardEvent;
(global as any).MouseEvent = win.MouseEvent;
(global as any).FocusEvent = win.FocusEvent;
(global as any).object = win.object;
(global as any).navigator = win.navigator;
(global as any).localStorage = win.localStorage;
(global as any).sessionStorage = win.sessionStorage;
(global as any).DOMTokenList = win.DOMTokenList;
// *******************************************************

import { ngExpressEngine } from '@nguniversal/express-engine';
import express from 'express';
import { join } from 'path';

import { AppServerModule } from './main.server';
import { APP_BASE_HREF } from '@angular/common';
import { existsSync } from 'fs';

// The Express app is exported so that it can be used by serverless Functions.
export function app() {
    const server = express();
    const distFolder = join(process.cwd(), 'dist/authorization/browser');
    const indexHtml = existsSync(join(distFolder, 'index.original.html')) ? 'index.original.html' : 'index';
    
    // Our Universal express-engine (found @ https://github.com/angular/universal/tree/master/modules/express-engine)
    server.engine('html', ngExpressEngine({
        bootstrap: AppServerModule,
    }));
    
    // Disable powered by option
    server.disable('x-powered-by');
    
    // to gzip static assets
    // const compressionModule = require('compression');
    // server.use(compressionModule());
    
    server.set('view engine', 'html');
    server.set('views', distFolder);
    
    // Serve static files from /browser
    server.get('*.*', express.static(distFolder, {
        maxAge: '1y'
    }));
    
    // All regular routes use the Universal engine
    server.get('*', (req, res) => {
        res.render(indexHtml, { req, providers: [{ provide: APP_BASE_HREF, useValue: req.baseUrl }] });
    });
    
    return server;
}

function run() {
    const port = process.env['PORT'] || 4000;
    
    // Start up the Node server
    const server = app();
    server.listen(port, () => {
        console.log(`Node Express server listening on http://localhost:${port}`);
    });
}

// Webpack will replace 'require' with '__webpack_require__'
// '__non_webpack_require__' is a proxy to Node 'require'
// The below code is to ensure that the server is run only when not requiring the bundle.
declare const __non_webpack_require__: NodeRequire;
const mainModule = __non_webpack_require__.main;
const moduleFilename = mainModule && mainModule.filename || '';
if (moduleFilename === __filename || moduleFilename.includes('iisnode')) {
    run();
}

export * from './main.server';
