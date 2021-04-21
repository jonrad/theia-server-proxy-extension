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
import { ServerProxyRpcClient, ServerProxyRpcServer } from '../common/rpc';
import { ServerProxy, ServerProxyInstanceStatus } from '../common/server-proxy';
import { Disposable, Emitter, Path } from '@theia/core';
import { ServerProxyInstance } from './server-proxy-instance';

@injectable()
export class ServerProxyInstanceManager implements Disposable {
    private readonly disposable: Disposable;

    private readonly instancesById: Map<number, { instance: ServerProxyInstance, emitter: Emitter<ServerProxyInstanceStatus> }> =
        new Map<number, { instance: ServerProxyInstance, emitter: Emitter<ServerProxyInstanceStatus> }>();

    constructor(
        @inject(ServerProxyRpcServer) private readonly serverProxyRpcServer: ServerProxyRpcServer,
        @inject(ServerProxyRpcClient) private readonly serverProxyRpcClient: ServerProxyRpcClient
    ) {
        this.disposable = this.serverProxyRpcClient.statusChanged(status => {
            const maybeInstance = this.instancesById.get(status.instanceId);
            if (!maybeInstance) {
                return;
            }

            const { instance, emitter } = maybeInstance;
            if (instance.status.timeMs > status.timeMs) {
                return;
            }

            emitter.fire(status);

            if (ServerProxyInstanceStatus.isCompleted(status)) {
                this.instancesById.delete(status.instanceId);
            }
        });
    }

    private async buildServerProxyInstance(serverProxy: ServerProxy, path: Path, instanceStatus: ServerProxyInstanceStatus): Promise<ServerProxyInstance> {
        const instanceId = instanceStatus.instanceId;

        const emitter = new Emitter<ServerProxyInstanceStatus>();

        const instance = new ServerProxyInstance(
            instanceStatus,
            serverProxy,
            path,
            this.serverProxyRpcServer,
            emitter.event
        );

        // At this point, the status checker will be able to refresh our new instance
        this.instancesById.set(instanceStatus.instanceId, { instance, emitter });

        // The status may have updated before we added it to the dictionary. So let's verify we have the latest
        const latestStatus = await this.serverProxyRpcServer.getInstanceStatus(
            instanceId
        )

        if (!latestStatus) {
            // Server lost our instance somehow (eg it crashed)
            this.instancesById.delete(instanceId)
            throw Error('Was able to start the instance, but it seems to have crashed');
        }

        if (latestStatus.timeMs > instance.status.timeMs) {
            emitter.fire(latestStatus);
        }

        return instance;
    }

    public async getOrCreateInstance(serverProxy: ServerProxy, path: Path): Promise<ServerProxyInstance> {
        const currentInstanceStatus = await this.serverProxyRpcServer.getInstance(
            serverProxy.id,
            path.toString()
        );

        if (currentInstanceStatus) {
            return this.buildServerProxyInstance(serverProxy, path, currentInstanceStatus);
        }

        return this.startInstance(serverProxy, path);
    }

    public async startInstance(serverProxy: ServerProxy, path: Path): Promise<ServerProxyInstance> {
        const instanceStatus = await this.serverProxyRpcServer.startInstance(
            serverProxy.id,
            path.toString()
        );

        return this.buildServerProxyInstance(serverProxy, path, instanceStatus);
    }

    public async getInstances(): Promise<ServerProxyInstance[]> {
        return Array.from(
            this.instancesById.values(),
            ({ instance }) => instance
        );
    }

    public async getInstancesByType(serverProxyId: string): Promise<ServerProxyInstance[]> {
        return (await this.getInstances()).filter(s => s.serverProxy.id == serverProxyId);
    }

    dispose(): void {
        this.disposable.dispose();
        this.instancesById.forEach(({ emitter }) => emitter.dispose());
        this.instancesById.clear();
    }
}
