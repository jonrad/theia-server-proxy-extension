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
import { createProxyMiddleware, Options, RequestHandler } from 'http-proxy-middleware';
import { injectable, inject } from 'inversify';
import { BaseServerProxyInstanceBuilder, ServerProxyCommand, ServerProxyContribution } from 'theia-server-proxy-extension/lib/node/server-proxy-contribution';
import { ServerProxy } from 'theia-server-proxy-extension/lib/common/server-proxy';
import { Extension } from '../common/const';
import ServerProxyContext from '../common/server-proxy-context';
import { ServerProxyUrlManager } from "theia-server-proxy-extension/lib/common/server-proxy-url-manager";

@injectable()
export class MlFlowUiInstanceBuilder extends BaseServerProxyInstanceBuilder<ServerProxyContext> {
    serverProxy: ServerProxy = Extension.ServerProxy;

    async getCommand(_instanceId: string, context: ServerProxyContext): Promise<ServerProxyCommand> {
        const port = await this.findAvailablePort();

        const command = [
            'mlflow',
            'ui',
            `--backend-store-uri=${context.backendStoreUri}`,
            `--port=${port}`
        ];

        return {
            command,
            port
        }
    }
}

@injectable()
export class MlFlowUiServerProxyContribution implements ServerProxyContribution {

    id: string = Extension.ID;

    name: string = Extension.Name;

    @inject(ServerProxyUrlManager)
    protected readonly serverProxyUrlManager: ServerProxyUrlManager;

    constructor(
        @inject(MlFlowUiInstanceBuilder) public readonly serverProxyInstanceBuilder: MlFlowUiInstanceBuilder
    ) {
    }

    getMiddleware(basePath: string, baseOptions: Options): RequestHandler {
        const pathRewriter: { [key: string]: string } = {};
        pathRewriter[this.serverProxyUrlManager.getPathMatchRegex()] = '';
        baseOptions.pathRewrite = pathRewriter;

        const onProxyReq = baseOptions.onProxyReq;
        baseOptions.onProxyReq = (proxyReq: http.ClientRequest, req: express.Request, res: express.Response) => {
            if (req.originalUrl.endsWith('/theia-container.html')) {
                // hack to handle mlflow trying to access the window's parent location, which doesn't work in electron
                // https://github.com/mlflow/mlflow/issues/3583
                const text = '<html><iframe src="./" style="border: none; margin: 0; padding: 0; width: 100%; height: 100%;" /></html>';
                req.body = text;
                res.status(200);
                res.setHeader('Content-Length', Buffer.byteLength(text));
                res.write(text);
                res.end();
            } else {
                onProxyReq?.(proxyReq, req, res);
            }
        }

        return createProxyMiddleware(basePath, baseOptions);
    }
}
