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
import { BackendApplicationCliContribution, BackendApplicationContribution } from '@theia/core/lib/node/backend-application';
import { createProxyMiddleware, Options, RequestHandler } from 'http-proxy-middleware';
import { ServerProxyInstanceManager } from './server-proxy-instance-manager';
import { ServerProxyManager } from './server-proxy-manager';
import * as querystring from 'querystring';
import { ServerProxyUrlManager } from '../common/server-proxy-url-manager';

@injectable()
export class ServerProxyExpressContribution implements BackendApplicationContribution {
    @inject(BackendApplicationCliContribution)
    private readonly backendApplicationCliContribution: BackendApplicationCliContribution;

    @inject(ServerProxyInstanceManager)
    private readonly instanceManager: ServerProxyInstanceManager

    @inject(ServerProxyManager)
    private readonly serverProxyManager: ServerProxyManager

    @inject(ServerProxyUrlManager)
    private readonly serverProxyUrlManager: ServerProxyUrlManager;

    private middlewaresByServerProxyId: Map<string, RequestHandler> = new Map<string, RequestHandler>();

    private homePathProxy: RequestHandler | undefined;

    private theiaHomePath: string;

    configure(app: express.Application): void {
        this.theiaHomePath = this.serverProxyUrlManager.theiaHomePath;

        this.serverProxyManager.get().forEach(serverProxy => {
            const basePath = this.serverProxyUrlManager.getServerProxyHomePath(serverProxy);

            const baseOptions: Options = {
                target: "http://localhost:31337", // not used, but is required by http-proxy-middleware
                ws: true,
                changeOrigin: true,
                router: (req) => {
                    //TODO optimize
                    const path = req.path || req.url;
                    if (!path) {
                        return;
                    }

                    const details = this.serverProxyUrlManager.getDetailsFromPath(path);
                    if (!details) {
                        return;
                    }

                    const { instanceId } = details;
                    const port = this.instanceManager.getInstancePort(instanceId);
                    if (!port) {
                        throw Error(`Server Proxy with id ${instanceId} does not exist`);
                    }

                    const hostname = `http://localhost:${port}`;
                    // TODO make this just instance id and server proxy
                    (<any>req).serverProxyBasePath = this.serverProxyUrlManager.getInternalPath(serverProxy, instanceId);
                    (<any>req).target = hostname;

                    return hostname;
                },
                onProxyReq: (proxyReq, req) => {
                    const target = (<any>req).target;

                    proxyReq.setHeader('Hostname', target);
                    proxyReq.setHeader('Origin', target);

                    // https://github.com/chimurai/http-proxy-middleware/blob/6fd75f7187924702e1da769210f58761b19ad40a/src/handlers/fix-request-body.ts
                    if (!req.body || !Object.keys(req.body).length) {
                        return;
                    }

                    const contentType = proxyReq.getHeader('Content-Type') as string;
                    const writeBody = (bodyData: string) => {
                        // deepcode ignore ContentLengthInCode: bodyParser fix
                        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
                        proxyReq.write(bodyData);
                    };

                    if (contentType && contentType.includes('application/json')) {
                        writeBody(JSON.stringify(req.body));
                    }

                    if (contentType === 'application/x-www-form-urlencoded') {
                        writeBody(querystring.stringify(req.body));
                    }
                }
            };

            const middleware = serverProxy.getMiddleware?.(basePath, baseOptions) || createProxyMiddleware(basePath, baseOptions);

            app.use(basePath, middleware);

            this.middlewaresByServerProxyId.set(serverProxy.id, middleware)
        });

        // Rewrite request from the home path to the path theia expects
        // eg if theiaHomePath is /theia, rewrite /theia/foo to /foo
        if (this.theiaHomePath) {
            const pathRewrite: { [key: string]: string } = {};
            pathRewrite[`^${this.theiaHomePath}`] = '';
            const options: Options = {
                target: `http://localhost:${this.backendApplicationCliContribution.port}`,
                changeOrigin: true,
                ws: true,
                pathRewrite: pathRewrite
            };

            // avoid rewriting server-proxy requests, as each server proxy middleware handles it
            this.homePathProxy = createProxyMiddleware([`${this.theiaHomePath}/**`, `!${this.serverProxyUrlManager.serverProxyPublicRootPath}/**`], options);
            app.use(this.theiaHomePath, this.homePathProxy);
        }
    }

    async onStart(server: http.Server | https.Server): Promise<void> {
        // this is brittle and needs to be fixed. how do we know the order things are registered?
        const fallbackListeners = server.rawListeners('upgrade').slice(0);
        server.removeAllListeners('upgrade');

        const callFallback = (req: express.Request, socket: net.Socket, head: any) => {
            fallbackListeners.forEach(listener => listener(req, socket, head));
        }

        // let our proxy handle the upgrade if possible. if not, use the fallback
        server.on('upgrade', (req: express.Request, socket: net.Socket, head: any) => {
            const path = req.path || req.url;
            const details = this.serverProxyUrlManager.getDetailsFromPath(path);

            if (!details) {
                if (this.theiaHomePath && path.startsWith(this.theiaHomePath)) {
                    this.homePathProxy?.upgrade?.(req, socket, head);
                    return;
                }

                callFallback(req, socket, head);
                return;
            }

            const { instanceId, serverProxyId } = details;

            const port = this.instanceManager.getInstancePort(instanceId);
            req.hostname = `localhost:${port}`;
            req.headers.origin = `http://localhost:${port}`;
            req.headers.host = `localhost:${port}`;

            const middlewares = this.middlewaresByServerProxyId;
            const middleware = middlewares.get(serverProxyId);

            middleware?.upgrade?.(req, socket, head);
        });
    }
}
