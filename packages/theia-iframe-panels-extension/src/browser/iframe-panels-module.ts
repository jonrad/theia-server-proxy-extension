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

import { ContainerModule, interfaces } from 'inversify';
import { IFrameWidget, IFrameWidgetMode, IFrameWidgetOptions } from 'theia-server-proxy-iframe-extension/lib/browser/iframe-widget';
import { IFrameStatus } from 'theia-server-proxy-iframe-extension/lib/browser/iframe-status';

import { FrontendApplicationContribution, KeybindingContribution, ViewContainer, WidgetFactory, WidgetManager } from '@theia/core/lib/browser';
import { bindContributionProvider, CommandContribution, MenuContribution } from '@theia/core';
import { IFramePanelOptions, IFramePanelsContribution, IFrameSidePanels, IFramePanel } from "./iframe-panels"

export default new ContainerModule((bind: interfaces.Bind) => {
    bindContributionProvider(bind, IFramePanelsContribution);

    bind(WidgetFactory).toDynamicValue(({ container }) => ({
        id: IFramePanel.ID,
        createWidget: async (options: IFramePanelOptions) => {
            const viewContainer = container.get<ViewContainer.Factory>(ViewContainer.Factory)({
                id: IFramePanel.ID,
            });

            viewContainer.title.label = options.name;
            viewContainer.title.closable = false
            if (options.icon) {
                viewContainer.title.iconClass = options.icon;
            }

            const widgetManager = container.get<WidgetManager>(WidgetManager);
            const widgetOptions: IFrameWidgetOptions = {
                id: options.id,
                name: options.id,
                startUrl: options.url,
                mode: IFrameWidgetMode.IFrame,
                status: IFrameStatus.ready
            };

            const widget = await widgetManager.getOrCreateWidget(IFrameWidget.ID, widgetOptions);

            viewContainer.addWidget(widget, {
                canHide: false,
                initiallyCollapsed: false
            });

            viewContainer.getPartFor(widget)?.hideTitle();
            viewContainer.id = options.id;

            return viewContainer;
        }
    })).inSingletonScope();

    bind(IFrameSidePanels).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toService(IFrameSidePanels);
    bind(CommandContribution).toService(IFrameSidePanels);
    bind(KeybindingContribution).toService(IFrameSidePanels);
    bind(MenuContribution).toService(IFrameSidePanels);
});
