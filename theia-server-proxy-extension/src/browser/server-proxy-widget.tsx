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
import { ServerProxyContentStyle } from './server-proxy-content-style';
import { ServerProxyApp } from './server-proxy-app';
import { buildUri } from './server-proxy-uri';

@injectable()
export class ServerProxyWidget extends ReactWidget {

    static readonly ID = 'server.proxy.widget';

    @inject(ServerProxyRpcServer)
    protected readonly serverProxyRpcServer: ServerProxyRpcServer;

    @inject(CommandRegistry)
    protected readonly commandRegistry: CommandRegistry;

    private ready: Boolean = false;

    private appId: number | undefined = undefined;

    private app: ServerProxyApp;

    constructor() {
        super();
    }

    public async init(app: ServerProxyApp): Promise<void> {
        const serverProxy = app.serverProxy;

        this.id = buildUri(serverProxy.id, app.path).toString();
        this.app = app;

        this.title.label = serverProxy.name;
        this.title.caption = serverProxy.name;
        this.title.closable = true;

        this.update();

        this.app.started.then((appId: number | undefined) => {
            if (!appId) {
                // TODO some information
                this.dispose();
                return;
            }

            this.appId = appId;
            this.ready = true;
            this.update();
        })
    }

    public dispose(): void {
        this.app.stop();

        super.dispose();
    }

    protected render(): React.ReactNode {
        if (this.ready) {
            // TODO use function for uri
            return <iframe src={`/server-proxy/${this.app.serverProxy.id}/${this.appId}/`} style={{
                width: '100%',
                height: '100%'
            }}></iframe>;
        } else {
            return <div className={ServerProxyContentStyle.LOADING}></div>;
        }
    }
}
