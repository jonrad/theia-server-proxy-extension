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
import { RawProcess, RawProcessFactory } from '@theia/process/lib/node';
import * as http from 'http';
import { injectable, inject } from 'inversify';
import * as getPort from 'get-port';
import { ServerProxyManager } from './server-proxy-contribution';

class ServerProxyApplication {
    constructor(
        public readonly serverProxyId: string,
        public readonly appId: number,
        public readonly port: number,
        // this shouldn't be exposed
        public readonly process: RawProcess
    ) {
    }

    public async isRunning(): Promise<Boolean> {
        return new Promise((resolve, reject) => {
            const request = http.get(`http://localhost:${this.port}/server-proxy/${this.serverProxyId}/${this.appId}/`);

            request.on('error', (err: Error) => resolve(false));
            request.on('response', (response: http.IncomingMessage) => {
                resolve(true)
            });
        });
    }

}

@injectable()
export class AppManager {
    private appById: Map<number, ServerProxyApplication> = new Map<number, ServerProxyApplication>()

    private lastAppId = 0;

    @inject(RawProcessFactory)
    private readonly rawProcessFactory: RawProcessFactory;

    @inject(ServerProxyManager)
    private readonly serverProxyManager: ServerProxyManager;

    public getAppPort(id: number): number | undefined {
        return this.appById.get(id)?.port;
    }

    public async stopApp(id: number): Promise<Boolean> {
        const app = this.appById.get(id);
        this.appById.delete(id);

        if (app) {
            await app.process.kill();
            return true;
        } else {
            return false;
        }
    }

    private async findAvailablePort(): Promise<number> {
        return await getPort();
    }

    public async startApp(id: string, path: string, args: any): Promise<number | undefined> {
        // TODO figure out theia configuration provider
        const port: number = await this.findAvailablePort();
        const appId: number = ++this.lastAppId;
        console.log(`Routing ${appId} to ${port}`);

        const serverProxy = this.serverProxyManager.getById(id);

        if (!serverProxy) {
            //fail
            return;
        }

        const command = serverProxy.getCommand({
            relativeUrl: `/server-proxy/${serverProxy.id}/${appId}`,
            port: port,
            workspacePath: path
        });

        if (command.length == 0) {
            //fail
            return;
        }

        const process = this.rawProcessFactory({
            command: command[0],
            args: command.slice(1)
        });

        try {
            await process.onStart;

            const app = new ServerProxyApplication(
                id,
                appId,
                port,
                process
            );

            while (!(await app.isRunning())) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                //infinite
            }

            this.appById.set(appId, app);

            return appId;
        } catch (e) {
            process.kill();
            this.appById.delete(appId);
            throw e;
        }

        // todo error handling
    }
}
