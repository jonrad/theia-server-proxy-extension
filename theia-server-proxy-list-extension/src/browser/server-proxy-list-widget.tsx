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

import "../../styles/server-proxy-list.css"
import * as React from 'react';
import { inject, injectable, postConstruct } from 'inversify';
import { ReactWidget } from '@theia/core/lib/browser';
import { ServerProxyInstanceManager } from 'theia-server-proxy-extension/lib/browser/server-proxy-instance-manager';
import { ServerProxyInstance } from 'theia-server-proxy-extension/lib/browser/server-proxy-instance';
import { ServerProxyOpenHandler } from 'theia-server-proxy-extension/lib/browser/server-proxy-open-handler';
import { WindowService } from "@theia/core/lib/browser/window/window-service";
import { ServerProxyInstanceStatus } from "theia-server-proxy-extension/lib/common/server-proxy";
import { ServerProxyUrlManager } from "theia-server-proxy-extension/lib/common/server-proxy-url-manager";

@injectable()
export class ServerProxyListWidget extends ReactWidget {
    public static readonly ID: string = "server.proxy.debug.widget";

    static readonly LABEL = 'Server Proxy List';

    @inject(ServerProxyInstanceManager)
    protected readonly serverProxyInstanceManager: ServerProxyInstanceManager;

    @inject(WindowService)
    protected readonly windowService: WindowService;

    @inject(ServerProxyOpenHandler)
    protected readonly serverProxyOpenHandler: ServerProxyOpenHandler;

    @inject(ServerProxyUrlManager)
    protected readonly serverProxyUrlManager: ServerProxyUrlManager;

    protected serverProxyInstances: ServerProxyInstance[] = [];

    @postConstruct()
    protected async init(): Promise<void> {
        this.id = ServerProxyListWidget.ID;
        this.title.label = ServerProxyListWidget.LABEL;
        this.title.caption = ServerProxyListWidget.LABEL;
        this.title.closable = true;

        this.serverProxyInstances = await this.serverProxyInstanceManager.getInstances();

        this.update();

        this.toDispose.push(this.serverProxyInstanceManager.updated(async () => {
            this.serverProxyInstances = await this.serverProxyInstanceManager.getInstances();
            this.update();
        }));
    }

    protected async onOpen(instance: ServerProxyInstance): Promise<void> {
        await this.serverProxyOpenHandler.openInstance(
            instance
        );
    }

    protected render(): React.ReactNode {
        return (<div className="server-proxy-list">
            {this.serverProxyInstances.map(instance => {
                return <ServerProxyComponent key={instance.id} {...{
                    instance,
                    onStop: () => instance.stop(),
                    onOpen: () => this.onOpen(instance),
                    onOpenBrowser: () => this.windowService.openNewWindow(
                        this.serverProxyUrlManager.getPublicPath(instance.serverProxy, instance.id),
                        { external: true }
                    )
                }} />
            })}
        </div >);
    }
}

export interface ServerProxyComponentProps {
    onOpenBrowser: () => void;
    onStop: () => Promise<Boolean>;
    onOpen: () => Promise<void>
    instance: ServerProxyInstance
}

class ServerProxyComponent extends React.Component<ServerProxyComponentProps> {

    private getStatusClassName(): string {
        if (ServerProxyInstanceStatus.isRunning(this.props.instance.status)) {
            return "status-started";
        } else if (ServerProxyInstanceStatus.isCompleted(this.props.instance.status)) {
            return "status-stopped";
        } else {
            return "status-loading";
        }
    }

    render(): JSX.Element {
        const instance = this.props.instance;

        const actions = [];
        actions.push(<button className="theia-button" key="stop" onClick={this.props.onStop}>Stop</button>);
        actions.push(<button className="theia-button" key="open" onClick={this.props.onOpen}>Open</button>);
        actions.push(<button className="theia-button" key="open-browser" onClick={this.props.onOpenBrowser}>Open in Browser</button>);

        const statusClassName = this.getStatusClassName();
        return <div className="row exposedPort" id={"port-" + instance.id} title={JSON.stringify(instance.context)}>
            <span className="indicator"><i className={"fa " + statusClassName}></i></span>
            <span className="name">{instance.serverProxy.name}</span>
            <span className="name"> – {instance.status.statusId}</span>
            <span className="actions">
                {actions}
            </span>
        </div>
    }
}
