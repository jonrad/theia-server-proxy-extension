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

import { ContainerModule, injectable, interfaces } from 'inversify';
import { IFrameWidget, IFrameWidgetMode, IFrameWidgetOptions } from './iframe-widget';

import '../../src/browser/style/index.css';
import { AbstractViewContribution, bindViewContribution, FrontendApplicationContribution, ViewContainer, ViewContainerTitleOptions, Widget, WidgetFactory, WidgetManager } from '@theia/core/lib/browser';
import { IFrameStatus } from './iframe-status';

export namespace IFramePanel {
    export const ID: string = "iframe.panel";

    export const VIEW_ID: string = "frame.panel.view";
}

export interface IFramePanelOptions {
    readonly id: string,
    readonly url: string
};
// https://fontawesome.com/v4.7/icons/

@injectable()
export class SampleUnclosableViewContribution extends AbstractViewContribution<Widget> implements FrontendApplicationContribution {

    constructor() {
        super({
            widgetId: IFramePanel.VIEW_ID,
            widgetName: 'Sample Unclosable View',
            // toggleCommandId: 'sampleUnclosableView:toggle',
            defaultWidgetOptions: {
                area: 'left',
                rank: 500
            }
        });
    }

    async initializeLayout(): Promise<void> {
        await this.openView();
    }
}

export default new ContainerModule((bind: interfaces.Bind) => {
    bind(WidgetFactory).toDynamicValue(ctx => ({
        id: IFramePanel.ID,
        createWidget: (panelOptions: IFramePanelOptions) => {
            const widgetManager = ctx.container.get<WidgetManager>(WidgetManager);
            const widgetOptions: IFrameWidgetOptions = {
                id: panelOptions.id,
                name: panelOptions.id,
                startUrl: panelOptions.url,
                mode: IFrameWidgetMode.IFrame,
                status: IFrameStatus.ready
            };

            return widgetManager.getOrCreateWidget(IFrameWidget.ID, widgetOptions);
        }
    }));
    bind(WidgetFactory).toDynamicValue(({ container }) => ({
        id: IFramePanel.VIEW_ID,
        createWidget: async () => {
            console.log("in view create")
            const viewContainer = container.get<ViewContainer.Factory>(ViewContainer.Factory)({
                id: IFramePanel.VIEW_ID,
            });

            viewContainer.title.label = "label here"
            viewContainer.title.closable = false
            viewContainer.title.iconClass = 'fa fa-git';

            // viewContainer.setTitleOptions(SCM_VIEW_CONTAINER_TITLE_OPTIONS);
            const widget = await container.get(WidgetManager).getOrCreateWidget(IFramePanel.ID, {
                id: "foo",
                url: "http://www.example.com"
            });

            viewContainer.addWidget(widget, {
                canHide: false,
                initiallyCollapsed: false
            });

            viewContainer.getPartFor(widget)?.hideTitle();

            return viewContainer;
        }
    })).inSingletonScope();

    bindViewContribution(bind, SampleUnclosableViewContribution);
    bind(FrontendApplicationContribution).toService(SampleUnclosableViewContribution);

    bind(IFrameWidget).toSelf();
    bind(WidgetFactory).toDynamicValue(context => ({
        id: IFrameWidget.ID,
        async createWidget(options: IFrameWidgetOptions): Promise<IFrameWidget> {
            const { container } = context;

            const child = container.createChild();
            child.bind(IFrameWidgetOptions).toConstantValue(options);

            return child.get(IFrameWidget);
        }
    })).inSingletonScope();
});
