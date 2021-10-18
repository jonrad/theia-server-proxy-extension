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
import { ServerProxyContribution, ServerProxyInstanceBuilder } from 'theia-server-proxy-extension/lib/node/server-proxy-contribution';
import { ServerProxyInstance, AbstractServerProxyInstance } from 'theia-server-proxy-extension/lib/node/server-proxy-instance';
import { ServerProxy, StatusId } from 'theia-server-proxy-extension/lib/common/server-proxy';
import { Extension } from '../common/const';
import ServerProxyContext from '../common/server-proxy-context';
import { ServerProxyUrlManager } from "theia-server-proxy-extension/lib/common/server-proxy-url-manager";

class OpenPortServerProxyInstance extends AbstractServerProxyInstance {
    async stop(): Promise<boolean> {
        this.setStatus(StatusId.stopped);
        return true;
    }

    async init(): Promise<void> {
        this.setStatus(StatusId.started);
    }
}

@injectable()
export class PortProxyInstanceBuilder implements ServerProxyInstanceBuilder {
    serverProxy: ServerProxy = Extension.ServerProxy;

    async build(instanceId: string, context: ServerProxyContext): Promise<ServerProxyInstance> {
        return new OpenPortServerProxyInstance(
            instanceId,
            context,
            this.serverProxy.id,
            context.port
        );
    }
}

@injectable()
export class PortProxyServerProxyContribution implements ServerProxyContribution {

    id: string = Extension.ID;

    name: string = Extension.Name;

    @inject(ServerProxyUrlManager)
    protected readonly serverProxyUrlManager: ServerProxyUrlManager;

    constructor(
        @inject(PortProxyInstanceBuilder) public readonly serverProxyInstanceBuilder: PortProxyInstanceBuilder
    ) {
    }

    getMiddleware(basePath: string, baseOptions: Options): RequestHandler {
        const pathRewriter: { [key: string]: string } = {};
        pathRewriter[this.serverProxyUrlManager.getPathMatchRegex()] = '';
        baseOptions.pathRewrite = pathRewriter;

        return createProxyMiddleware(basePath, baseOptions);
    }
}
