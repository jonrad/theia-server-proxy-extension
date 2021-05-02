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

import { WidgetFactory, WebSocketConnectionProvider, OpenHandler } from '@theia/core/lib/browser';
import { ContainerModule, interfaces } from 'inversify';
import { ServerProxyRpcServer, ServerProxyRpcClient } from '../common/rpc';
import { ServerProxyWidget, ServerProxyWidgetOptions } from './server-proxy-widget';
import { ServerProxyRpcClientImpl } from './server-proxy-rpc-client-impl';
import { ServerProxyManager } from './server-proxy-manager';
import { ServerProxyInstanceManager } from './server-proxy-instance-manager';
import { ServerProxyInstance, ServerProxyInstanceImpl, ServerProxyInstanceImplFactory, ServerProxyInstanceProps } from './server-proxy-instance';
import { ServerProxyRpcServerProxy } from './server-proxy-rpc-server-proxy';
import { ServerProxyOpenHandler } from './server-proxy-open-handler';

export default new ContainerModule((bind: interfaces.Bind) => {
    bind(ServerProxyWidget).to(ServerProxyWidget);
    bind(WidgetFactory).toDynamicValue(context => {
        const { container } = context;
        const instanceManager = container.get(ServerProxyInstanceManager);

        return {
            id: ServerProxyWidget.ID,
            async createWidget(options: ServerProxyWidgetOptions): Promise<ServerProxyWidget> {
                const instance = await instanceManager.getInstanceById(options.serverProxyInstanceId);

                if (!instance) {
                    throw new Error(`Instance ${options.serverProxyInstanceId} does not exist`);
                }

                const child = container.createChild();
                child.bind(ServerProxyInstance).toConstantValue(instance);

                return child.get(ServerProxyWidget);
            }
        }
    }).inSingletonScope();

    bind(ServerProxyInstanceImpl).toSelf();
    bind<interfaces.Factory<ServerProxyInstanceImpl>>(ServerProxyInstanceImplFactory).toFactory(ctx => {
        const { container } = ctx;
        return (props: ServerProxyInstanceProps) => {
            const child = container.createChild();
            child.bind(ServerProxyInstanceProps).toConstantValue(props);

            return child.get(ServerProxyInstanceImpl);
        };
    });

    bind(ServerProxyManager).toSelf().inSingletonScope();
    bind(ServerProxyInstanceManager).toSelf().inSingletonScope();

    bind(ServerProxyRpcClient).to(ServerProxyRpcClientImpl).inSingletonScope();
    bind(ServerProxyRpcServerProxy).toDynamicValue(ctx => {
        const client = ctx.container.get<ServerProxyRpcClient>(ServerProxyRpcClient);
        const connection = ctx.container.get(WebSocketConnectionProvider);
        return connection.createProxy<ServerProxyRpcServer>('/services/server-proxy', client);
    }).inSingletonScope();

    bind(ServerProxyRpcServer).toDynamicValue(ctx => ctx.container.get(ServerProxyRpcServerProxy));

    bind(OpenHandler).to(ServerProxyOpenHandler);
});
