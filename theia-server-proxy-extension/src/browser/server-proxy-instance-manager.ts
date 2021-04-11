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

import { injectable, inject, postConstruct } from 'inversify';
import { ServerProxyRpcClient, ServerProxyRpcServer } from '../common/rpc';
import { ServerProxy, ServerProxyInstanceStatus } from '../common/server-proxy';
import { Disposable, Emitter, Path } from '@theia/core';
import { ServerProxyInstance } from './server-proxy-instance';

@injectable()
export class ServerProxyInstanceManager implements Disposable {
    @inject(ServerProxyRpcServer)
    private readonly serverProxyRpcServer: ServerProxyRpcServer;

    @inject(ServerProxyRpcClient)
    private readonly serverProxyRpcClient: ServerProxyRpcClient;

    private disposable: Disposable;

    private readonly instancesById: Map<number, { instance: ServerProxyInstance, emitter: Emitter<ServerProxyInstanceStatus> }> =
        new Map<number, { instance: ServerProxyInstance, emitter: Emitter<ServerProxyInstanceStatus> }>();

    @postConstruct()
    protected init(): void {
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
        });
    }

    public async startInstance(serverProxy: ServerProxy, path: Path): Promise<ServerProxyInstance> {
        const instanceStatus = await this.serverProxyRpcServer.startApp(
            serverProxy.id,
            path.toString()
        );

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
        const latestStatus = await this.serverProxyRpcServer.getStatus(
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

    dispose(): void {
        this.disposable?.dispose();
        this.instancesById.forEach(({ emitter }) => emitter.dispose());
        this.instancesById.clear();
    }
}
