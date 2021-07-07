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

import { ContainerModule, interfaces } from 'inversify';
import { BackendApplicationContribution } from '@theia/core/lib/node/backend-application';
import { ConnectionHandler, JsonRpcConnectionHandler } from '@theia/core/lib/common';
import { ServerProxyRpcClient } from '../common/rpc';
import { ServerProxyRpcServer } from '../common/rpc';
import { bindContributionProvider } from '@theia/core';
import { ServerProxyInstanceManager } from './server-proxy-instance-manager';
import { ServerProxyContribution } from './server-proxy-contribution';
import { ServerProxyExpressContribution } from './server-proxy-express-contribution';
import { ServerProxyRpcServerImpl } from './server-proxy-rpc-server-impl';
import { ServerProxyManager } from './server-proxy-manager';
import { ServerProxyConfiguration, serverProxyConfigurationPath } from '../common/server-proxy-configuration';
import { ServerProxyUrlManager } from '../common/server-proxy-url-manager';
import { ServerProxyConfigurationImpl } from './server-proxy-configuration-impl';
import { CliContribution } from '@theia/core/lib/node';

export default new ContainerModule((bind: interfaces.Bind) => {
    bind(ServerProxyConfigurationImpl).toSelf().inSingletonScope();

    bind(ServerProxyConfiguration).toService(ServerProxyConfigurationImpl);
    bind(CliContribution).toService(ServerProxyConfigurationImpl);

    bind(ConnectionHandler).toDynamicValue(ctx =>
        new JsonRpcConnectionHandler(serverProxyConfigurationPath, () => ctx.container.get<ServerProxyConfiguration>(ServerProxyConfiguration))
    ).inSingletonScope();
    bind(ServerProxyUrlManager).toSelf().inSingletonScope();

    bind(ServerProxyInstanceManager).toSelf().inSingletonScope();
    bind(ServerProxyExpressContribution).toSelf();
    bind(BackendApplicationContribution).toService(ServerProxyExpressContribution);

    bindContributionProvider(bind, ServerProxyContribution);
    bind(ServerProxyManager).toSelf().inSingletonScope();

    bind(ServerProxyRpcServer).to(ServerProxyRpcServerImpl).inSingletonScope();
    bind(ConnectionHandler).toDynamicValue(ctx =>
        new JsonRpcConnectionHandler<ServerProxyRpcClient>("/services/server-proxy", client => {
            const server = ctx.container.get<ServerProxyRpcServer>(ServerProxyRpcServer);
            server.setClient(client);
            client.onDidCloseConnection(() => server.unsetClient(client));
            return server;
        })
    ).inSingletonScope();
});
