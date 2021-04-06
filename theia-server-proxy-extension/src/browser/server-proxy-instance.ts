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

import { Disposable, Event, Path } from '@theia/core';
import { ServerProxyRpcServer } from '../common/rpc';
import { ServerProxy, ServerProxyInstanceStatus } from '../common/server-proxy';

export class ServerProxyInstance implements Disposable {
    public readonly id: number;

    public readonly serverProxy: ServerProxy;

    public readonly path: Path;

    private _status: ServerProxyInstanceStatus
    public get status(): ServerProxyInstanceStatus {
        return this._status;
    }

    public readonly statusChangedEvent: Event<ServerProxyInstanceStatus>;

    private readonly serverProxyRpcServer: ServerProxyRpcServer;

    private readonly disposable: Disposable;

    constructor(
        initialStatus: ServerProxyInstanceStatus,
        serverProxy: ServerProxy,
        path: Path,
        serverProxyRpcServer: ServerProxyRpcServer,
        statusChangedEvent: Event<ServerProxyInstanceStatus>
    ) {
        this.id = initialStatus.instanceId;
        this.serverProxy = serverProxy;
        this.path = path;
        this._status = initialStatus;
        this.statusChangedEvent = statusChangedEvent;
        this.serverProxyRpcServer = serverProxyRpcServer;

        this.disposable = statusChangedEvent((status) => {
            this._status = status;
        })
    }

    public stop(): Promise<Boolean> {
        return this.serverProxyRpcServer.stopApp(this.id);
    }

    dispose(): void {
        this.disposable.dispose();
    }
}
