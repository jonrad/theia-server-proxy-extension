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

import { CommandContribution } from '@theia/core';
import { WidgetFactory, WebSocketConnectionProvider, OpenHandler } from '@theia/core/lib/browser';
import { ContainerModule, interfaces } from 'inversify';

import { ServerProxyRpcServer, ServerProxyRpcClient } from '../common/rpc';

import { ServerProxyCommandContribution } from './server-proxy-command-contribution';
import { ServerProxyWidgetOpenHandler } from "./server-proxy-widget-open-handler";
import { ServerProxyWidget } from './server-proxy-widget';
import { ServerProxyRpcClientImpl } from './server-proxy-rpc-client-impl';
import { ServerProxyWidgetFactory } from './server-proxy-widget-factory';
import { ServerProxyManager } from './server-proxy-manager';

import '../../src/browser/style/index.css';
import { ServerProxyInstanceManager } from './server-proxy-instance-manager';

export default new ContainerModule((bind: interfaces.Bind) => {
    bind(ServerProxyCommandContribution).toSelf();
    bind(CommandContribution).toService(ServerProxyCommandContribution);

    // The widget and everything needed to build it
    bind(ServerProxyWidget).toSelf();
    bind<interfaces.Factory<ServerProxyWidget>>(ServerProxyWidget.ID).toFactory<ServerProxyWidget>((context: interfaces.Context) => {
        return () => context.container.get<ServerProxyWidget>(ServerProxyWidget);
    });
    bind(ServerProxyWidgetFactory).toSelf();
    bind(WidgetFactory).toService(ServerProxyWidgetFactory);

    bind(ServerProxyManager).toSelf();
    bind(ServerProxyInstanceManager).toSelf();

    bind(ServerProxyWidgetOpenHandler).toSelf().inSingletonScope();
    bind(OpenHandler).toService(ServerProxyWidgetOpenHandler);

    bind(ServerProxyRpcClient).to(ServerProxyRpcClientImpl).inSingletonScope();
    bind(ServerProxyRpcServer).toDynamicValue(ctx => {
        const client = ctx.container.get<ServerProxyRpcClient>(ServerProxyRpcClient);
        const connection = ctx.container.get(WebSocketConnectionProvider);
        return connection.createProxy<ServerProxyRpcServer>('/services/server-proxy', client);
    }).inSingletonScope();
});
