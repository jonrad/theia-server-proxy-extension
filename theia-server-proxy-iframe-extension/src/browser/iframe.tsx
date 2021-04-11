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
import { IFrameContentStyle } from './iframe-content-style';

export class IFrame extends React.Component<IFrame.Props> {
    render(): React.ReactNode {
        const {
            url,
            status,
            statusText,
            // loadingIcon
        } = this.props;

        if (status == "loading") {
            return <div className={IFrameContentStyle.LOADING}></div>;
        } else if (status == "stopped") {
            return <div className={IFrameContentStyle.FULLSCREEN}>Instance stopped: {statusText}</div>;
        } else {
            return <iframe src={url} className={IFrameContentStyle.FULLSCREEN}></iframe>;
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
