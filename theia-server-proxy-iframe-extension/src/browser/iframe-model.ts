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

import { Emitter, Event } from '@theia/core/lib/common';

export class IFrameModel {
    private _name: string;
    private _url: string;
    private _status: string;

    private updatedEmitter: Emitter<IFrameModel> = new Emitter<IFrameModel>();

    get name(): string {
        return this._name;
    }
    set name(value: string) {
        this._name = value;
        this.updatedEmitter.fire(this);
    }

    get url(): string {
        return this._url;
    }
    set url(value: string) {
        this._url = value;
        this.updatedEmitter.fire(this);
    }

    get status(): string {
        return this._status;
    }
    set status(value: string) {
        this._status = value;
        this.updatedEmitter.fire(this);
    }

    get updated(): Event<IFrameModel> {
        return this.updatedEmitter.event;
    }

    constructor(
        name: string,
        url: string,
        status: string
    ) {
        this._name = name;
        this._url = url;
        this._status = status;
    }
}
