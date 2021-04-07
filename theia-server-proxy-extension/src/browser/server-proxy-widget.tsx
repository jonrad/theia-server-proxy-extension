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
import { Disposable, Event } from '@theia/core/lib/common';
import { ServerProxyRpcServer } from '../common/rpc';
import { ServerProxyContentStyle } from './server-proxy-content-style';
import { ServerProxyInstance } from './server-proxy-instance';
import { buildUri } from './server-proxy-uri';
import { ServerProxyInstanceStatus, StatusId } from '../common/server-proxy';

export class IFrame extends React.Component<IFrame.Props> {
    render(): React.ReactNode {
        const {
            url,
            status,
            statusText,
            loadingIcon
        } = this.props;

        if (status == "loading") {
            return <div className={ServerProxyContentStyle.LOADING}></div>;
        } else if (status == "stopped") {
            return <div style={{
                width: '100%',
                height: '100%'
            }}>Instance stopped</div>;
        } else {
            return <iframe src={url} style={{
                width: '100%',
                height: '100%'
            }}></iframe>;
        }
    }

    focus(): void {
        if (this.ref) {
            this.ref.focus();
        }
    }

    protected ref: HTMLElement | undefined;
    protected setRef = (ref: HTMLElement | null) => this.ref = ref || undefined;
}

export namespace IFrame {
    export interface Props {
        url: string
        status: string
        statusText?: string
        loadingIcon?: string
    }
}

interface IFrameModel {
    url: string;

    name: string;

    status: string;

    changed: Event<void>
}

@injectable()
export class IFrameWidget extends ReactWidget {

    static readonly ID = 'server.proxy.iframe.widget';

    private readonly disposables: Disposable[] = [];

    private model: IFrameModel;

    constructor(iframeModel: IFrameModel) {
        super();

        this.id = IFrameWidget.ID + "-" + iframeModel.url;

        this.title.label = iframeModel.name;
        this.title.caption = iframeModel.name;
        this.title.closable = true;

        this.disposables.push(iframeModel.changed(() => {
            this.update();
        }));

        this.update();
    }

    public dispose(): void {
        this.disposables.forEach(d => d.dispose());
        super.dispose();
    }

    protected render(): React.ReactNode {
        return <IFrame
            url={this.model.url}
            status={this.model.status} />
    }
}

@injectable()
export class ServerProxyWidget extends IFrameWidget {

    static readonly ID = 'server.proxy.widget';

    private readonly disposables: Disposable[] = [];

    private get ready(): boolean {
        const status = this.instance.status;
        return status.statusId == StatusId.started;
    }

    private get stopped(): boolean {
        return ServerProxyInstanceStatus.isCompleted(this.instance.status);
    }

    private readonly instance: ServerProxyInstance;

    private static buildStatus(instance: ServerProxyInstance): string {
        return "ready";
    }

    constructor(
        instance: ServerProxyInstance
    ) {
        super(
            {
                url = `/server-proxy/${instance.serverProxy.id}/${instance.id}/`,
                name = instance.serverProxy.name,
                status = ServerProxyWidget.buildStatus(instance),
                changed = undefined
            }
        );

        this.instance = instance;
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
        const status = (() => {
            if (this.ready) {
                return "ready";
            } else if (this.stopped) {
                return "stopped";
            } else {
                return "loading";
            }
        })();

        return <IFrame
            url={`/server-proxy/${this.instance.serverProxy.id}/${this.instance.id}/`}
            status={status} />
    }
}
