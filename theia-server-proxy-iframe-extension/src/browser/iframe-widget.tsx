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
import { injectable } from 'inversify';
import { ReactWidget } from '@theia/core/lib/browser/widgets/react-widget';
import { Disposable } from '@theia/core/lib/common';
import { IFrame } from './iframe';
import { IFrameModel } from './iframe-model';

@injectable()
export class IFrameWidget extends ReactWidget {

    protected readonly disposables: Disposable[] = [];

    constructor(protected readonly model: IFrameModel) {
        super();

        this.id = IFrameWidget.ID + "-" + model.url;

        this.title.label = model.name;
        this.title.caption = model.name;
        this.title.closable = true;

        this.disposables.push(model.updated(() => {
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
            status={this.model.status} />;
    }
}

export namespace IFrameWidget {
    export const ID: string = "iframe.widget";
}
