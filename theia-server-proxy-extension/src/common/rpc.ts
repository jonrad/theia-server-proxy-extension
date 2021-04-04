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

import { JsonRpcServer } from "@theia/core";
import { ServerProxy } from "./server-proxy";

export const ServerProxyRpcServer = Symbol('IServerProxyRpcServer');
export interface ServerProxyRpcServer extends JsonRpcServer<ServerProxyRpcClient> {
    startApp(id: string, workspace: string, args?: any): Promise<number | undefined>

    stopApp(id: number): Promise<Boolean>

    getServerProxies(): Promise<ServerProxy[]>
}

export const ServerProxyRpcClient = Symbol('ServerProxyRpcClient');
export interface ServerProxyRpcClient {
  // This is empty for now, but keeping it here for future purposes
  // eg to be able to notify the client of the current status of the app
}
