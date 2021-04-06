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

import { Path } from '@theia/core';
import { ServerProxyRpcServer } from '../common/rpc';
import { ServerProxy } from '../common/server-proxy';

export class ServerProxyApp {
    started: Promise<number>;

    constructor(
        private readonly serverProxyRpcServer: ServerProxyRpcServer, //GROSS! FIX ME
        public readonly serverProxy: ServerProxy,
        public readonly path: Path
    ) {
        this.started = this.serverProxyRpcServer.startApp(
            this.serverProxy.id,
            this.path.toString()
        );
    }

    public async stop(): Promise<void> {
        const appId = await this.started;
        this.serverProxyRpcServer.stopApp(appId);
    }
}
