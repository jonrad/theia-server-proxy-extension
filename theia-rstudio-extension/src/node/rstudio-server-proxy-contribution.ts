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

import { createProxyMiddleware, Options, RequestHandler } from 'http-proxy-middleware';
import { injectable, inject } from 'inversify';
import { ServerProxyContribution, ServerProxyCommand, BaseServerProxyInstanceBuilder } from 'theia-server-proxy-extension/lib/node/server-proxy-contribution';
import { ServerProxyInstance } from 'theia-server-proxy-extension/lib/node/server-proxy-instance';
import { ServerProxyInstanceStatus } from 'theia-server-proxy-extension/lib/common/server-proxy';
import { Request, Response } from 'express'
import * as http from 'http';
import * as os from 'os';
import { Extension } from '../common/const';

@injectable()
export class RStudioServerProxyInstanceBuilder extends BaseServerProxyInstanceBuilder<void> {
    id: string = Extension.ID;

    instance: ServerProxyInstance | undefined;

    async build(instanceId: string, relativeUrl: string, context: void): Promise<ServerProxyInstance> {
        if (!this.instance || ServerProxyInstanceStatus.isCompleted(this.instance.status)) {
            this.instance = await super.build(instanceId, relativeUrl, context);
        }

        return this.instance;
    }

    async getCommand(relativeUrl: string, context: any): Promise<ServerProxyCommand> {
        // TODO configurable
        const port = 8787;

        const command = [
            "/usr/lib/rstudio-server/bin/rserver",
            "--server-daemonize=0", //run as app, not a service
            "--auth-none=1", //no auth
            `--www-frame-origin=any`, // this is concerning, insecure
            `--www-port=${port.toString()}`, //set port
            `--auth-minimum-user-id=0` //allow root
        ]

        return {
            port,
            command,
            env: {
                "USER": os.userInfo().username
            }
        };
    }
}

@injectable()
export class RStudioServerProxyContribution implements ServerProxyContribution {

    id: string = "rstudio";

    name: string = "RStudio";

    instance: ServerProxyInstance | undefined;

    constructor(
        @inject(RStudioServerProxyInstanceBuilder) public readonly serverProxyInstanceBuilder: RStudioServerProxyInstanceBuilder
    ) {
    }

    private clientId: string | undefined;
    private clientVersion: string | undefined;
    private csrfToken: string | undefined;

    getMiddleware(basePath: string, baseOptions: Options): RequestHandler {
        baseOptions.pathRewrite = { '^(/[^ /]*){3}': '' };

        baseOptions.onProxyRes = (proxyRes: http.IncomingMessage, req: Request, res: Response) => {
            var redirect = proxyRes.headers.location;
            if (!redirect) {
                return;
            }

            const serverProxyBasePath = (<any>req).serverProxyBasePath as string;
            const hostname = req.headers["host"];

            // TODO https
            // this should probably be changed altogether to not depend on the user's request
            redirect = redirect.replace('http://localhost:8787/', `http://${hostname}${serverProxyBasePath}`);
            console.log(`Settings redirect from '${proxyRes.headers.location}' to '${redirect}'`);
            proxyRes.headers.location = redirect
        };

        const baseOnProxyReq = baseOptions.onProxyReq;
        baseOptions.onProxyReq = (proxyReq, request, response) => {
            if (request.url == "/rpc/set_user_state") {
                const json = request.body;
                this.clientId = json.clientId;
                this.clientVersion = json.clientVersion;
                this.csrfToken = request.headers["x-csrf-token"]?.toString();
            } else if (request.url == '/rpc/theia_remote') {
                if (!request.body || !this.csrfToken || !this.clientVersion || !this.clientId) {
                    // TODO return an unhandled or something
                    baseOnProxyReq?.(proxyReq, request, response);
                    return;
                }

                const body = request.body;
                delete request.body;

                body.clientId = this.clientId;
                body.clientVersion = this.clientVersion;

                const bodyStringified = JSON.stringify(body);
                proxyReq.setHeader('Content-Length', bodyStringified.length);

                proxyReq.setHeader('X-CSRF-Token', this.csrfToken);

                proxyReq.path = '/rpc/console_input';
                proxyReq.write(bodyStringified);
                return;
            }

            baseOnProxyReq?.(proxyReq, request, response);
        };


        return createProxyMiddleware(basePath, baseOptions);
    }
}
