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

import { inject, injectable } from 'inversify';
import { Event, Emitter } from '@theia/core';
import { ServerProxyRpcServer } from '../common/rpc';
import { ServerProxy, ServerProxyInstanceStatus } from '../common/server-proxy';

export const ServerProxyInstance = Symbol('ServerProxyInstance');
export interface ServerProxyInstance {
    readonly id: string;

    readonly serverProxy: ServerProxy;

    readonly context: any;

    readonly status: ServerProxyInstanceStatus;

    readonly statusChangedEvent: Event<ServerProxyInstanceStatus>;

    stop(): Promise<Boolean>;
}

export const ServerProxyInstanceProps = Symbol('ServerProxyInstanceProps');
export interface ServerProxyInstanceProps {
    readonly id: string;
    readonly serverProxy: ServerProxy;
    readonly context: any;
    readonly status: ServerProxyInstanceStatus;
}

export const ServerProxyInstanceImplFactory = Symbol('ServerProxyInstanceImplFactory')

@injectable()
export class ServerProxyInstanceImpl implements ServerProxyInstance {
    public readonly id: string;

    public readonly serverProxy: ServerProxy;

    public readonly context: any;

    public readonly statusChangedEventEmitter: Emitter<ServerProxyInstanceStatus> = new Emitter<ServerProxyInstanceStatus>();
    public readonly statusChangedEvent: Event<ServerProxyInstanceStatus> = this.statusChangedEventEmitter.event;

    private _status: ServerProxyInstanceStatus
    public get status(): ServerProxyInstanceStatus {
        return this._status;
    }

    constructor(
        @inject(ServerProxyInstanceProps) props: ServerProxyInstanceProps,
        @inject(ServerProxyRpcServer) protected readonly serverProxyRpcServer: ServerProxyRpcServer
    ) {
        this.id = props.id;
        this.serverProxy = props.serverProxy;
        this.context = props.context;
        this._status = props.status;

        this.serverProxyRpcServer = serverProxyRpcServer;
    }

    public stop(): Promise<Boolean> {
        return this.serverProxyRpcServer.stopInstance(this.id);
    }

    public setStatus(status: ServerProxyInstanceStatus): void {
        if (this._status == status) {
            return;
        }

        this._status = status;
        this.statusChangedEventEmitter.fire(status);
    }
}
