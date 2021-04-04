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

import * as React from 'react';
import { injectable, inject } from 'inversify';
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';
import { CommandRegistry } from '@theia/core/lib/common';
import { ServerProxyRpcServer } from '../common/rpc';
import { ServerProxyRequest } from './server-proxy-request';
import { BUSY_CLASS } from '@theia/core/lib/browser';
import { ServerProxyContentStyle } from './server-proxy-content-style';

@injectable()
export class ServerProxyWidget extends ReactWidget {

    static readonly ID = 'server.proxy.widget';

    @inject(ServerProxyRpcServer)
    protected readonly serverProxyRpcServer: ServerProxyRpcServer;

    @inject(CommandRegistry)
    protected readonly commandRegistry: CommandRegistry;

    private ready: Boolean = false;

    private appId: number | undefined = undefined;

    private serverProxyRequest: ServerProxyRequest;

    constructor() {
        super();
    }

    public async init(request: ServerProxyRequest): Promise<void> {
        this.id = request.serverProxy.id;
        this.serverProxyRequest = request;

        this.title.label = this.serverProxyRequest.serverProxy.name;
        this.title.caption = this.serverProxyRequest.serverProxy.name;
        this.title.closable = true;

        // TODO 0 get this out of here
        const promise = this.serverProxyRpcServer.startApp(
            this.serverProxyRequest.serverProxy.id,
            this.serverProxyRequest.path.toString()
        );

        this.update();

        const appId = await promise;

        if (!appId) {
            this.dispose();
            return;
        }

        this.appId = appId;
        this.ready = true;
        this.update();
    }

    public dispose(): void {
        if (this.appId) {
            this.serverProxyRpcServer.stopApp(this.appId);
        }
        super.dispose();
    }

    protected render(): React.ReactNode {
        if (this.ready) {
            // TODO use function for uri
            return <iframe src={`/server-proxy/${this.serverProxyRequest.serverProxy.id}/${this.appId}/`} style={{
                width: '100%',
                height: '100%'
            }}></iframe>;
        } else {
          return <div className={ServerProxyContentStyle.PRE_LOAD}></div>;
        }
    }
}
