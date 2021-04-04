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

import * as React from 'react';
import { injectable, inject } from 'inversify';
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';
import { CommandRegistry } from '@theia/core/lib/common';
import { ServerProxyRpcServer } from '../common/rpc';
import { ServerProxyWidgetContext } from './server-proxy-widget-context';
import { ServerProxyContentStyle } from './server-proxy-content-style';

@injectable()
export class ServerProxyWidget extends ReactWidget {

    static readonly ID = 'server.proxy.widget';

    @inject(ServerProxyRpcServer)
    protected readonly serverProxyRpcServer: ServerProxyRpcServer;

    @inject(CommandRegistry)
    protected readonly commandRegistry: CommandRegistry;

    private ready: Boolean = false;

    private appId: number | undefined = undefined;

    private context: ServerProxyWidgetContext;

    constructor() {
        super();
    }

    public async init(context: ServerProxyWidgetContext): Promise<void> {
        this.id = context.id;

        this.context = context;

        this.title.label = this.context.serverProxy.name;
        this.title.caption = this.context.serverProxy.name;
        this.title.closable = true;

        const promise = context.appPromise;

        this.update();

        promise.then((appId: number | undefined) => {
          if (!appId) {
              // TODO some information
              this.dispose();
              return;
          }

          this.appId = appId;
          this.ready = true;
          this.update();
        })
    }

    public dispose(): void {
        this.context.appPromise.then(p => {
          this.context.stop();
        });

        super.dispose();
    }

    protected render(): React.ReactNode {
        if (this.ready) {
            // TODO use function for uri
            return <iframe src={`/server-proxy/${this.context.serverProxy.id}/${this.appId}/`} style={{
                width: '100%',
                height: '100%'
            }}></iframe>;
        } else {
          return <div className={ServerProxyContentStyle.LOADING}></div>;
        }
    }
}
