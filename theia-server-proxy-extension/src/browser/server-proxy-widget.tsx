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
import { CommandRegistry, Disposable } from '@theia/core/lib/common';
import { ServerProxyRpcServer } from '../common/rpc';
import { ServerProxyContentStyle } from './server-proxy-content-style';
import { ServerProxyInstance } from './server-proxy-instance';
import { buildUri } from './server-proxy-uri';
import { ServerProxyInstanceStatus, StatusId } from '../common/server-proxy';

@injectable()
export class ServerProxyWidget extends ReactWidget {

    static readonly ID = 'server.proxy.widget';

    @inject(ServerProxyRpcServer)
    protected readonly serverProxyRpcServer: ServerProxyRpcServer;

    @inject(CommandRegistry)
    protected readonly commandRegistry: CommandRegistry;

    private readonly disposables: Disposable[] = [];

    private get ready(): boolean {
        const status = this.instance.status;
        return status.statusId == StatusId.started;
    }

    private get stopped(): boolean {
        return ServerProxyInstanceStatus.isCompleted(this.instance.status);
    }

    private instance: ServerProxyInstance;

    public async init(instance: ServerProxyInstance): Promise<void> {
        const serverProxy = instance.serverProxy;

        this.id = buildUri(serverProxy.id, instance.path).toString();
        this.instance = instance;

        this.title.label = serverProxy.name;
        this.title.caption = serverProxy.name;
        this.title.closable = true;

        this.disposables.push(this.instance); // TODO this isn't right. What if we want it to stick around?
        this.disposables.push(instance.statusChangedEvent(() => {
            this.update();
        }));

        this.update();
    }

    public dispose(): void {
        this.disposables.forEach(d => d.dispose());
        super.dispose();
    }

    protected render(): React.ReactNode {
        if (this.ready) {
            // TODO use function for uri
            return <iframe src={`/server-proxy/${this.instance.serverProxy.id}/${this.instance.id}/`} style={{
                width: '100%',
                height: '100%'
            }}></iframe>;
        } else if (this.stopped) {
            return <div style={{
                width: '100%',
                height: '100%'
            }}>Instance stopped</div>;
        } else {
            return <div className={ServerProxyContentStyle.LOADING}></div>;
        }
    }
}
