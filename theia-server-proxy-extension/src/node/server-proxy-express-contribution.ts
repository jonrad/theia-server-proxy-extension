/********************************************************************************
 * Copyright (C) 2021 Jon Radchenko and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

import * as express from 'express';
import * as http from 'http';
import * as https from 'https';
import * as net from 'net';
import { injectable, inject } from 'inversify';
import { BackendApplicationContribution } from '@theia/core/lib/node/backend-application';
import { createProxyMiddleware, Options, RequestHandler } from 'http-proxy-middleware';
import { ServerProxyInstanceManager } from './server-proxy-instance-manager';
import { ServerProxyManager } from './server-proxy-manager';

@injectable()
export class ServerProxyExpressContribution implements BackendApplicationContribution {
    @inject(ServerProxyInstanceManager)
    private readonly instanceManager: ServerProxyInstanceManager

    @inject(ServerProxyManager)
    private readonly serverProxyManager: ServerProxyManager

    private middlewaresById: Map<string, RequestHandler> = new Map<string, RequestHandler>();

    configure(app: express.Application): void {
        this.serverProxyManager.get().forEach(serverProxy => {
            // TODO share code
            const basePath = `/server-proxy/${serverProxy.id}/`;

            const baseOptions: Options = {
                target: "http://localhost:31337", // not used, but is required by http-proxy-middleware
                ws: true,
                changeOrigin: true,
                router: (req: express.Request) => {
                    const path = req.path || req.url;
                    if (!path) {
                        return;
                    }

                    const split = path.split('/');
                    if (!split || split.length < 4) {
                        return;
                    }
                    const instanceId = split[3];
                    const port = this.instanceManager.getInstancePort(instanceId);
                    if (!port) {
                        throw Error(`Server Proxy with id ${instanceId} does not exist`);
                    }

                    const hostname = `http://localhost:${port}`;
                    req.hostname = hostname;
                    req.headers.origin = hostname;

                    return hostname;
                }
            };

            const middleware = serverProxy.getMiddleware?.(basePath, baseOptions) || createProxyMiddleware(basePath, baseOptions);

            app.use(basePath, middleware);

            // Terrible no good very bad hack
            // proxy middleware needs to have priority otherwise it tends to clash with certain other middlewares
            // in particular body-parser
            // So we move the newly added middleware to the front using an undocument api
            const stack: Array<Object> = app._router.stack;
            stack.unshift(stack.pop()!);

            this.middlewaresById.set(serverProxy.id, middleware)
        });
    }

    async onStart(server: http.Server | https.Server): Promise<void> {
        // this is brittle and needs to be fixed. how do we know the order things are registered?

        const fallbackListeners = server.rawListeners('upgrade').slice(0);
        server.removeAllListeners('upgrade');

        const callFallback = (req: express.Request, socket: net.Socket, head: any) => {
            fallbackListeners.forEach(l => l(req, socket, head));
        }

        // let our proxy handle the upgrade if possible. if not, use the fallback
        server.on('upgrade', (req: express.Request, socket: net.Socket, head: any) => {
            const path = req.path || req.url;
            const split = path.split('/');
            if (!split || split.length < 4 || split[1] != 'server-proxy') {
                callFallback(req, socket, head);
                return;
            }
            const serverProxyId = split[2];
            const middlewares = this.middlewaresById;
            const middleware = middlewares.get(serverProxyId);
            middleware?.upgrade?.(req, socket, head);
        });
    }
}
