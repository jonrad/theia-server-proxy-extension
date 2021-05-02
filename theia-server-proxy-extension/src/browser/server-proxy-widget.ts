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

import { injectable, inject } from 'inversify';
import { ServerProxyInstance } from './server-proxy-instance';
import { ServerProxyInstanceStatus, StatusId } from '../common/server-proxy';
import { IFrameContentStyle } from 'theia-server-proxy-iframe-extension/lib/browser/iframe-content-style';
import { IFrameWidget, IFrameWidgetMode } from 'theia-server-proxy-iframe-extension/lib/browser/iframe-widget';
import { IFrameStatus } from 'theia-server-proxy-iframe-extension/lib/browser/iframe-status';
import { BaseWidget, SingletonLayout, Endpoint, WidgetManager } from '@theia/core/lib/browser';

export const ServerProxyWidgetOptions = Symbol('ServerProxyWidgetOptions')
export interface ServerProxyWidgetOptions {
    serverProxyInstanceId: string
}

export interface ServerProxyWidgetProps {
    mode: IFrameWidgetMode
}

@injectable()
export class ServerProxyWidget extends BaseWidget {
    public static readonly ID: string = "server.proxy.widget";

    protected props: ServerProxyWidgetProps | undefined;

    private static buildIFrameStatus(status: ServerProxyInstanceStatus): IFrameStatus {
        if (status.statusId == StatusId.started) {
            return IFrameStatus.ready;
        } else if (ServerProxyInstanceStatus.isCompleted(status)) {
            return IFrameStatus.stopped;
        } else {
            return IFrameStatus.loading;
        }
    }

    @inject(WidgetManager) protected readonly widgetManager: WidgetManager;

    constructor(
        @inject(ServerProxyInstance) private readonly instance: ServerProxyInstance,
    ) {
        super();

        this.id = IFrameWidget.buildWidgetId(`server-proxy/${instance.serverProxy.id}/${instance.id}/`);

        const name = instance.serverProxy.name;
        this.title.label = name;
        this.title.caption = name;
        this.title.closable = true;
    }

    async setProps(props: ServerProxyWidgetProps): Promise<void> {
        // TODO we should be able to change this if we want
        if (this.props) {
            return;
        }

        this.props = props;

        const layout = this.layout = new SingletonLayout();
        const endpoint = new Endpoint({ path: `server-proxy/${this.instance.serverProxy.id}/${this.instance.id}/` });

        const widget = await this.widgetManager.getOrCreateWidget<IFrameWidget>(
            IFrameWidget.ID,
            {
                id: this.id + ":content",
                name: this.instance.serverProxy.name,
                startUrl: endpoint.getRestUrl().toString(),
                mode: props.mode,
                status: ServerProxyWidget.buildIFrameStatus(this.instance.status)
            });

        layout.widget = widget;
        this.node.className = IFrameContentStyle.FULLSCREEN;

        this.toDispose.push(this.instance.statusChangedEvent((status) => {
            widget.updateStatus(ServerProxyWidget.buildIFrameStatus(status));
        }));
    }

    storeState(): object {
        return { props: this.props };
    }

    restoreState(oldState: object): void {
        if ('props' in oldState) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this.setProps((oldState as any)['props']);
        }
    }
}
