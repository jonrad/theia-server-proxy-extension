/********************************************************************************
 * Copyright (C) 2018 Ericsson and others.
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

import { ContainerModule, interfaces } from 'inversify';

import * as express from 'express';
import * as http from 'http';
import * as https from 'https';
import * as net from 'net';
import { injectable, inject, postConstruct } from 'inversify';
import { BackendApplicationContribution } from '@theia/core/lib/node/backend-application';
import { createProxyMiddleware, RequestHandler } from 'http-proxy-middleware';
import { ConnectionHandler, JsonRpcConnectionHandler } from '@theia/core/lib/common';
import { ServerProxyRpcClient } from '../common/rpc';
import { ServerProxyRpcServer } from '../common/rpc';
import { ServerProxy } from '../common/server-proxy';
import { bindContributionProvider } from '@theia/core';
import { AppManager } from './server-proxy-application';
import { ServerProxyContribution, ServerProxyManager } from './server-proxy-contribution';

@injectable()
export class ServerProxyExpressContribution implements BackendApplicationContribution {
    @inject(AppManager)
    private readonly appManager: AppManager

    @inject(ServerProxyManager)
    private readonly serverProxyManager: ServerProxyManager

    private middlewaresById: Map<string, RequestHandler> = new Map<string, RequestHandler>();

    @postConstruct()
    async initialize(): Promise<void> {
        this.serverProxyManager.init();
    }

    configure(app: express.Application): void {
        this.serverProxyManager.get().forEach(serverProxy => {
            const basePath = `/server-proxy/${serverProxy.id}/`;

            const baseOptions = {
                target: "http://localhost:31337",
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
                    const appId = Number(split[3]);
                    const port = this.appManager.getAppPort(appId) || 80;
                    return `http://localhost:${port}`;
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
        server.on('upgrade', (req: express.Request, socket: net.Socket, head: any) => {
            for (const middleware of this.middlewaresById.values()) {
                if (middleware.upgrade) {
                    middleware.upgrade(req, socket, head);
                }
            }
        });
    }
}

@injectable()
export class ServerProxyServer implements ServerProxyRpcServer {
    client: ServerProxyRpcClient | undefined;

    @inject(AppManager)
    private readonly appManager: AppManager

    @inject(ServerProxyManager)
    private readonly serverProxyManager: ServerProxyManager

    async getServerProxies(): Promise<ServerProxy[]> {
        return this.serverProxyManager.get().map(c => {
            return {
                id: c.id,
                name: c.name
            }
        });
    }

    startApp(id: string, workspace: string, args?: any): Promise<number | undefined> {
        return this.appManager.startApp(id, workspace, args);
    }

    stopApp(id: number): Promise<Boolean> {
        return this.appManager.stopApp(id);
    }

    setClient(client: ServerProxyRpcClient | undefined): void {
        this.client = client;
    }

    dispose(): void {
    }
}

export default new ContainerModule((bind: interfaces.Bind, unbind: interfaces.Unbind, isBound: interfaces.IsBound, rebind: interfaces.Rebind) => {
    bind(AppManager).toSelf().inSingletonScope();
    bind(ServerProxyExpressContribution).toSelf();
    bind(BackendApplicationContribution).toService(ServerProxyExpressContribution);

    bind(ServerProxyRpcServer).to(ServerProxyServer);

    bindContributionProvider(bind, ServerProxyContribution);
    bind(ServerProxyManager).toSelf().inSingletonScope();

    bind(ConnectionHandler).toDynamicValue(ctx =>
        new JsonRpcConnectionHandler<ServerProxyRpcClient>("/services/server-proxy", client => {
            const server = ctx.container.get<ServerProxyRpcServer>(ServerProxyRpcServer);
            server.setClient(client);
            return server;
        })
    ).inSingletonScope();
});
