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

import { inject } from 'inversify';
import { IFrameStatus } from './iframe-status';
import { IFrameContentStyle } from './iframe-content-style';
import { BaseWidget, Widget, WidgetManager } from '@theia/core/lib/browser';
import { MiniBrowser, MiniBrowserOptions } from '@theia/mini-browser/lib/browser/mini-browser'
import URI from '@theia/core/lib/common/uri';

export enum IFrameWidgetMode {
    IFrame = "iframe",
    MiniBrowser = "browser"
}

export const IFrameWidgetOptions = Symbol('IFrameWidgetOptions');
export interface IFrameWidgetOptions {
    readonly id: string,
    readonly name: string,
    readonly startUrl: string,
    mode: IFrameWidgetMode,
    status: IFrameStatus
};

export class IFrameWidget extends BaseWidget {
    private status: IFrameStatus;

    private widget: Widget | undefined;


    constructor(
        @inject(IFrameWidgetOptions) protected readonly options: IFrameWidgetOptions,
        @inject(WidgetManager) protected readonly widgetManager: WidgetManager
    ) {
        super();

        this.id = options.id;
        this.status = options.status;

        this.title.label = options.name;;
        this.title.caption = options.name;;
        this.title.closable = true;
        this.node.className = IFrameContentStyle.FULLSCREEN;

        this.node.append(this.render());

        this.toDispose.push(this.onDidChangeVisibility(() => {
            this.node.hidden = this.isHidden;
        }));

        this.node.hidden = true;
    }

    public updateStatus(status: IFrameStatus) {
        if (this.status == status) {
            return;
        }

        this.status = status;

        if (this.widget) {
            this.widget.dispose();
            this.widget = undefined;
        }

        this.node.firstChild?.remove();
        this.node.append(this.render());
    }

    protected render(): HTMLElement {
        const status = this.status;
        const url = this.options.startUrl;

        const div = document.createElement('div');
        if (status == IFrameStatus.loading) {
            div.className = IFrameContentStyle.LOADING;
        } else if (status == IFrameStatus.stopped) {
            div.innerText = "Instance Stopped";
            div.className = IFrameContentStyle.FULLSCREEN;
        } else {
            this.buildIframe(url).then(frame => div.append(frame));
            div.className = IFrameContentStyle.FULLSCREEN;
        }

        return div;
    }

    protected async buildIframe(url: string): Promise<HTMLElement> {
        if (this.options.mode == IFrameWidgetMode.MiniBrowser) {
            const miniBrowser = this.widget = await this.widgetManager.getOrCreateWidget<MiniBrowser>(
                MiniBrowser.ID,
                {
                    iframeId: this.id,
                    uri: new URI(this.options.startUrl)
                } as MiniBrowserOptions);

            this.toDispose.push(miniBrowser);
            miniBrowser.setProps({
                startPage: this.options.startUrl
            });

            miniBrowser.node.className = IFrameContentStyle.FULLSCREEN;
            return miniBrowser.node;
        } else {
            const iframe = document.createElement('iframe');
            iframe.src = url;
            iframe.className = IFrameContentStyle.FULLSCREEN;
            return iframe;
        }
    }
}

export namespace IFrameWidget {
    export const ID: string = "iframe.widget";

    // TODO delete me
    export function buildWidgetId(uri: string): string {
        return ID + `- ${uri}`;
    }
}
