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
import { Path } from '@theia/core';
import { ILogger } from '@theia/core';

// TODO: configurable
const TIMEOUT = 30_000;

export class ServerProxyApplication {
    constructor(
        public readonly appId: number,
        public readonly serverProxyId: string,
        public readonly port: number,
        private readonly process: RawProcess
    ) {
    }

    private async isAccessible(): Promise<Boolean> {
        return new Promise((resolve, reject) => {
            // TODO 0 share this
            const request = http.get(`http://localhost:${this.port}/server-proxy/${this.serverProxyId}/${this.appId}/`);

            request.on('error', (err: Error) => resolve(false));
            request.on('response', (response: http.IncomingMessage) => {
                resolve(true)
            });
        });
    }

    public stop(): void {
        return this.process.kill();
    }

    public async init(): Promise<void> {
        try {
            await this.process.onStart;

            const startTime = new Date().getTime();

            while (!(await this.isAccessible())) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                if (new Date().getTime() - startTime > TIMEOUT) {
                    throw new Error("Timed out waiting for app to start");
                }
            }
        } catch (e) {
            throw e;
        }
    }
}

@injectable()
export class AppManager {
    private appById: Map<number, ServerProxyApplication> = new Map<number, ServerProxyApplication>()

    private lastAppId = 0;

    @inject(ILogger)
    protected readonly logger: ILogger;

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
            await app.stop();
            return true;
        } else {
            return false;
        }
    }

    private async findAvailablePort(): Promise<number> {
        return await getPort();
    }

    public async startApp(
        serverProxyId: string,
        path: Path
    ): Promise<number> {
        const port: number = await this.findAvailablePort();
        const appId: number = ++this.lastAppId;
        this.logger.info(`server-proxy mapping app id ${appId} for ${serverProxyId} to port ${port}`);
        const serverProxy = this.serverProxyManager.getById(serverProxyId);

        if (!serverProxy) {
            throw Error(`Invalid server proxy id ${serverProxyId}`);
        }

        const { command, env } = await serverProxy.getCommand({
            relativeUrl: `/server-proxy/${serverProxy.id}/${appId}`,
            port: port,
            workspacePath: path
        });

        if (command.length == 0) {
            throw Error(`Improperly configured server proxy ${serverProxyId}. Returned empty command`);
        }

        const envDict: { [name: string]: string | undefined } =
            env ? { ...process.env, ...env } : process.env;

        const rawProcess = this.rawProcessFactory({
            command: command[0],
            args: command.slice(1),
            options: {
                env: envDict
            }
        });

        const application = new ServerProxyApplication(
            appId,
            serverProxy.id,
            port,
            rawProcess
        );

        this.appById.set(appId, application);

        await application.init();

        return appId;
    }
}
