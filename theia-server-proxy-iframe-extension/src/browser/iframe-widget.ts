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

import { injectable } from 'inversify';
import { Disposable } from '@theia/core/lib/common';
import { IFrameModel, IFrameModelStatus } from './iframe-model';
import { IFrameContentStyle } from './iframe-content-style';
import { BaseWidget } from '@theia/core/lib/browser';

@injectable()
export class IFrameWidget extends BaseWidget {

    protected readonly disposables: Disposable[] = [];

    private currentStatus: IFrameModelStatus;

    constructor(
        public readonly id: string,
        protected readonly model: IFrameModel
    ) {
        super();

        this.title.label = model.name;
        this.title.caption = model.name;
        this.title.closable = true;

        this.node.append(this.render());
        this.currentStatus = this.model.status;

        this.disposables.push(model.updated(() => {
            if (model.status == this.currentStatus) {
                return;
            }

            this.node.firstChild?.remove();
            this.node.append(this.render());
        }));
    }

    public dispose(): void {
        this.disposables.forEach(d => d.dispose());
        super.dispose();
    }

    protected render(): HTMLElement {
        const status = this.model.status;
        const url = this.model.url;
        if (status == IFrameModelStatus.loading) {
            const div = document.createElement('div');
            div.className = IFrameContentStyle.LOADING;
            return div;
        } else if (status == IFrameModelStatus.stopped) {
            const div = document.createElement('div');
            div.innerText = "Instance Stopped";
            div.className = IFrameContentStyle.FULLSCREEN;
            return div;
        } else {
            return this.buildIframe(url);
        }
    }

    protected onIFrameLoad(frame: HTMLIFrameElement): void {
        const title = frame.contentDocument?.title;
        if (title) {
            this.title.label = title;
        }
    }

    protected buildIframe(url: string): HTMLElement {
        const iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.className = IFrameContentStyle.FULLSCREEN;
        if (this.model.useFrameTitle) {
            iframe.addEventListener('load', () => this.onIFrameLoad(iframe));
        }
        return iframe;
    }
}

export namespace IFrameWidget {
    export const ID: string = "iframe.widget";

    export function buildWidgetId(uri: string): string {
        return ID + `-${uri}`;
    }
}
