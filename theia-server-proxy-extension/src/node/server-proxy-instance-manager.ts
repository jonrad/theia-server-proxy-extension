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
import { RawProcessFactory } from '@theia/process/lib/node';
import { injectable, inject } from 'inversify';
import * as getAvailablePort from 'get-port';
import { Path } from '@theia/core';
import { ILogger } from '@theia/core';
import { ServerProxyManager } from './server-proxy-manager';
import { ServerProxyInstanceStatus } from '../common/server-proxy';
import { ServerProxyInstance } from './server-proxy-instance';

@injectable()
export class ServerProxyInstanceManager {
    private instanceById: Map<number, ServerProxyInstance> = new Map<number, ServerProxyInstance>()

    // does it matter that people can 'guess' other instance ids?
    private lastInstanceId = 0;

    @inject(ILogger)
    protected readonly logger: ILogger;

    @inject(RawProcessFactory)
    private readonly rawProcessFactory: RawProcessFactory;

    @inject(ServerProxyManager)
    private readonly serverProxyManager: ServerProxyManager;

    public getInstancePort(id: number): number | undefined {
        return this.instanceById.get(id)?.port;
    }

    private async findAvailablePort(): Promise<number> {
        return await getAvailablePort();
    }

    public async startInstance(
        serverProxyId: string,
        path: Path
    ): Promise<ServerProxyInstance> {
        const port: number = await this.findAvailablePort();
        const instanceId: number = ++this.lastInstanceId;
        this.logger.info(`server-proxy mapping instance id ${instanceId} for ${serverProxyId} to port ${port}`);
        const serverProxy = this.serverProxyManager.getById(serverProxyId);

        if (!serverProxy) {
            throw Error(`Invalid server proxy id ${serverProxyId}`);
        }

        const { command, env } = await serverProxy.getCommand({
            relativeUrl: `/server-proxy/${serverProxy.id}/${instanceId}`,
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

        const instance = new ServerProxyInstance(
            instanceId,
            serverProxy.id,
            port,
            rawProcess
        );

        this.instanceById.set(instanceId, instance);

        const maybeCleanup = () => {
            if (ServerProxyInstanceStatus.isCompleted(instance.status)) {
                this.instanceById.delete(instanceId);
                instance.dispose();
            }
        }

        instance.statusChanged((status) => {
            maybeCleanup();
        })

        maybeCleanup();

        instance.init();

        return instance;
    }

    public getInstanceStatus(
        instanceId: number
    ): ServerProxyInstanceStatus | undefined {
        return this.instanceById.get(instanceId)?.status;
    }

    public async stopInstance(id: number): Promise<Boolean> {
        const instance = this.instanceById.get(id);
        this.instanceById.delete(id);

        if (instance) {
            await instance.stop();
            return true;
        } else {
            return false;
        }
    }
}
