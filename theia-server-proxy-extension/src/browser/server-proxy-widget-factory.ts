/********************************************************************************
 * Copyright (C) 2018 Ericsson and others.
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

import { Widget, WidgetFactory } from '@theia/core/lib/browser';
import { injectable, inject } from 'inversify';
import { ServerProxyWidget } from './server-proxy-widget';
import { ServerProxyRequest } from './server-proxy-request';

@injectable()
export class ServerProxyWidgetFactory implements WidgetFactory {
    public id: string = ServerProxyWidget.ID;

    public constructor(
        @inject(ServerProxyWidget.ID) private readonly serverProxyWidgetFactory: () => ServerProxyWidget
    ) {
    }

    async createWidget(serverProxyRequest: ServerProxyRequest): Promise<Widget> {
        const widget = this.serverProxyWidgetFactory();
        widget.init(serverProxyRequest);

        return widget;
    }
}
