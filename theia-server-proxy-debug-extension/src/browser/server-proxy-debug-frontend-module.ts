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
import { WidgetFactory } from '@theia/core/lib/browser';
import { ContainerModule, interfaces } from 'inversify';

import { ServerProxyCommandContribution } from './server-proxy-debug-command-contribution';

import { ServerProxyDebugWidget } from './server-proxy-debug-widget';

export default new ContainerModule((bind: interfaces.Bind) => {
    bind(ServerProxyCommandContribution).toSelf();
    bind(CommandContribution).toService(ServerProxyCommandContribution);

    bind(ServerProxyDebugWidget).toSelf();
    bind(WidgetFactory).toDynamicValue(context => ({
        id: ServerProxyDebugWidget.ID,
        createWidget: () => context.container.get<ServerProxyDebugWidget>(ServerProxyDebugWidget),
    })).inSingletonScope();
});
