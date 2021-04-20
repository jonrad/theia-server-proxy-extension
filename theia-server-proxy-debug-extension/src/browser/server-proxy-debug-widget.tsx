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
import { inject, injectable, postConstruct } from 'inversify';
import { ReactWidget } from '@theia/core/lib/browser';
import { ServerProxyInstanceManager } from 'theia-server-proxy-extension/lib/browser/server-proxy-instance-manager';
import { ServerProxyInstance } from 'theia-server-proxy-extension/lib/browser/server-proxy-instance';

@injectable()
export class ServerProxyDebugWidget extends ReactWidget {
    public static readonly ID: string = "server.proxy.debug.widget";

    static readonly LABEL = 'Server Proxy Debug';

    @inject(ServerProxyInstanceManager)
    protected readonly serverProxyInstanceManager: ServerProxyInstanceManager;

    protected serverProxyInstances: ServerProxyInstance[] = [];

    @postConstruct()
    protected async init(): Promise<void> {
        this.id = ServerProxyDebugWidget.ID;
        this.title.label = ServerProxyDebugWidget.LABEL;
        this.title.caption = ServerProxyDebugWidget.LABEL;
        this.title.closable = true;

        this.serverProxyInstances = await this.serverProxyInstanceManager.getInstances();
        console.log(this.serverProxyInstances.length);

        this.update();
    }

    /**
     * Render the content of the widget.
     */
    protected render(): React.ReactNode {
        return (<div>
            <table style={{ width: "100%" }}>
                <thead>
                    <tr style={{ textAlign: "left" }}>
                        <th className='th-id'>id</th>
                        <th className='th-server-proxy'>server proxy</th>
                        <th className='th-status'>status</th>
                        <th className='th-context'>context</th>
                    </tr>
                </thead>
                <tbody>
                    {this.serverProxyInstances.map(instance => {
                        return <tr key={instance.id}>
                            <td>{instance.id}</td>
                            <td>{instance.serverProxy.id}</td>
                            <td>{instance.status.statusId}</td>
                            <td>{instance.path.toString()}</td>
                        </tr>
                    })}
                </tbody>
            </table>
        </div >);
    }
}
