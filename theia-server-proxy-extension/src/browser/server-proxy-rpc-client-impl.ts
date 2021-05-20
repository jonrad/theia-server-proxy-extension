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
import { Emitter, Event } from '@theia/core';
import { injectable } from 'inversify';
import { ServerProxyRpcClient } from '../common/rpc';
import { ServerProxyInstanceStatus } from '../common/server-proxy';

@injectable()
export class ServerProxyRpcClientImpl implements ServerProxyRpcClient {
    private readonly statusChangedEmitter: Emitter<ServerProxyInstanceStatus>;
    public readonly statusChanged: Event<ServerProxyInstanceStatus>;

    constructor() {
        this.statusChangedEmitter = new Emitter<ServerProxyInstanceStatus>();
        this.statusChanged = this.statusChangedEmitter.event;
    }

    fireStatusChanged(status: ServerProxyInstanceStatus): void {
        this.statusChangedEmitter.fire(status);
    }
}
