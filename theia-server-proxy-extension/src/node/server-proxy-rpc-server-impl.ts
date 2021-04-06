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

import { injectable, inject } from 'inversify';
import { Disposable, Path } from '@theia/core/lib/common';
import { AppStatus, ServerProxyApplication, ServerProxyRpcClient, StatusId } from '../common/rpc';
import { ServerProxyRpcServer } from '../common/rpc';
import { ServerProxy } from '../common/server-proxy';
import { AppManager } from './server-proxy-application';
import { ServerProxyManager } from './server-proxy-contribution';


@injectable()
export class ServerProxyRpcServerImpl implements ServerProxyRpcServer {
    client: ServerProxyRpcClient | undefined;

    @inject(AppManager)
    private readonly appManager: AppManager

    @inject(ServerProxyManager)
    private readonly serverProxyManager: ServerProxyManager

    private readonly appDisposable: Map<number, Disposable> = new Map<number, Disposable>();

    async getServerProxies(): Promise<ServerProxy[]> {
        return this.serverProxyManager.get().map(c => {
            return {
                id: c.id,
                name: c.name
            }
        });
    }

    sendStatus(appId: number, status: AppStatus): void {
        this.client?.onChange(appId, status);
    }

    async startApp(serverProxyId: string, workspace: string, args?: any): Promise<ServerProxyApplication> {
        const path = new Path(workspace);
        const app = await this.appManager.startApp(serverProxyId, path);

        const disposable = app.change((status: AppStatus) => {
            this.sendStatus(app.id, status);

            if (app.status.statusId == StatusId.failed || app.status.statusId == StatusId.stopped) {
                this.disposeApp(app.id);
            }
        });

        this.appDisposable.set(app.id, disposable);

        return app;
    }

    disposeApp(id: number): void {
        const disposable = this.appDisposable.get(id);
        if (disposable) {
            disposable.dispose();
            this.appDisposable.delete(id);
        }
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
