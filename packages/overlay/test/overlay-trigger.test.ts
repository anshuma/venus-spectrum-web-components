/*
Copyright 2020 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/
import { waitForPredicate, isVisible } from '../../../test/testing-helpers.js';
import { spy } from 'sinon';
import {
    fixture,
    aTimeout,
    html,
    expect,
    nextFrame,
    elementUpdated,
    waitUntil,
    oneEvent,
} from '@open-wc/testing';

import '../overlay-trigger.js';
import {
    OverlayTrigger,
    ActiveOverlay,
    TriggerInteractions,
    OverlayOpenCloseDetail,
} from '../';
import '@spectrum-web-components/button/sp-button.js';
import { Button } from '@spectrum-web-components/button';
import '@spectrum-web-components/popover/sp-popover.js';
import { Popover } from '@spectrum-web-components/popover';
import '@spectrum-web-components/theme/sp-theme.js';
import { Theme } from '@spectrum-web-components/theme';

function pressKey(code: string): void {
    const up = new KeyboardEvent('keyup', {
        bubbles: true,
        cancelable: true,
        key: code,
        code,
    });
    document.dispatchEvent(up);
}

const pressEscape = (): void => pressKey('Escape');
const pressSpace = (): void => pressKey('Space');

describe('Overlay Trigger', () => {
    describe('open/close', () => {
        let testDiv!: HTMLDivElement;
        let innerTrigger!: OverlayTrigger;
        let outerTrigger!: OverlayTrigger;
        let innerButton!: Button;
        let outerButton!: Button;
        let innerClickContent!: Popover;
        let outerClickContent!: Popover;
        let hoverContent!: HTMLDivElement;

        beforeEach(async () => {
            testDiv = await fixture<HTMLDivElement>(
                html`
                    <div>
                        <style>
                            body {
                                display: flex;
                                align-items: center;
                                justify-content: center;
                            }
                        </style>
                        <overlay-trigger id="trigger" placement="top">
                            <sp-button
                                id="outer-button"
                                variant="primary"
                                slot="trigger"
                            >
                                Show Popover
                            </sp-button>
                            <sp-popover
                                id="outer-popover"
                                dialog
                                slot="click-content"
                                direction="bottom"
                                tip
                                open
                                tabindex="0"
                            >
                                <div class="options-popover-content">
                                    <overlay-trigger
                                        id="inner-trigger"
                                        placement="bottom"
                                    >
                                        <sp-button
                                            id="inner-button"
                                            slot="trigger"
                                        >
                                            Press Me
                                        </sp-button>
                                        <sp-popover
                                            id="inner-popover"
                                            dialog
                                            slot="click-content"
                                            direction="bottom"
                                            tip
                                            open
                                            tabindex="0"
                                        >
                                            <div
                                                class="options-popover-content"
                                            >
                                                Another Popover
                                            </div>
                                        </sp-popover>
                                    </overlay-trigger>
                                </div>
                            </sp-popover>
                            <div
                                id="hover-content"
                                slot="hover-content"
                                class="tooltip"
                                delay="100"
                            >
                                Tooltip
                            </div>
                        </overlay-trigger>
                    </div>
                `
            );
            await elementUpdated(testDiv);

            innerTrigger = testDiv.querySelector(
                '#inner-trigger'
            ) as OverlayTrigger;
            outerTrigger = testDiv.querySelector('#trigger') as OverlayTrigger;
            innerButton = testDiv.querySelector('#inner-button') as Button;
            outerButton = testDiv.querySelector('#outer-button') as Button;
            innerClickContent = testDiv.querySelector(
                '#inner-popover'
            ) as Popover;
            outerClickContent = testDiv.querySelector(
                '#outer-popover'
            ) as Popover;
            hoverContent = testDiv.querySelector(
                '#hover-content'
            ) as HTMLDivElement;
        });

        afterEach(async () => {
            outerTrigger.removeAttribute('type');
            if (outerTrigger.open) {
                const closed = oneEvent(outerTrigger, 'sp-closed');
                outerTrigger.open = undefined;
                await closed;
            }
            innerTrigger.removeAttribute('type');
            if (innerTrigger.open) {
                const closed = oneEvent(innerTrigger, 'sp-closed');
                innerTrigger.open = undefined;
                await closed;
            }
        });

        it('loads', async () => {
            if (!(outerClickContent instanceof Popover))
                throw new Error('popover is not an instance of Popover');

            expect(outerClickContent).to.exist;
            expect(outerClickContent.shadowRoot).to.exist;
            expect(outerClickContent.parentElement).to.be.an.instanceOf(
                OverlayTrigger
            );
        });

        it('opens a popover', async () => {
            const button = testDiv.querySelector(
                '#outer-button'
            ) as HTMLElement;
            const outerPopover = testDiv.querySelector(
                '#outer-popover'
            ) as Popover;

            expect(isVisible(outerPopover)).to.be.false;

            expect(button).to.exist;
            button.click();

            // Wait for the DOM node to be stolen and reparented into the overlay
            await waitForPredicate(
                () => !(outerPopover.parentElement instanceof OverlayTrigger)
            );

            expect(outerPopover.parentElement).to.not.be.an.instanceOf(
                OverlayTrigger
            );
            expect(isVisible(outerPopover)).to.be.true;
        });

        it('[disabled] closes a popover', async () => {
            expect(isVisible(outerClickContent)).to.be.false;
            expect(outerTrigger.disabled).to.be.false;

            expect(outerButton).to.exist;
            outerButton.click();

            await waitUntil(
                () =>
                    !(
                        outerClickContent.parentElement instanceof
                        OverlayTrigger
                    ),
                'Wait for the DOM node to be stolen and reparented into the overlay'
            );

            expect(outerClickContent.parentElement).to.not.be.an.instanceOf(
                OverlayTrigger
            );
            expect(isVisible(outerClickContent)).to.be.true;

            outerTrigger.disabled = true;

            await waitUntil(
                () => outerClickContent.parentElement instanceof OverlayTrigger,
                'Wait for the DOM node to be returned to the overlay trigger'
            );

            expect(isVisible(outerClickContent)).to.be.false;
            expect(outerTrigger.disabled).to.be.true;
        });

        it('resizes a popover', async () => {
            expect(isVisible(outerClickContent)).to.be.false;

            expect(outerButton).to.exist;
            outerButton.click();

            // Wait for the DOM node to be stolen and reparented into the overlay
            await waitForPredicate(
                () =>
                    !(outerClickContent.parentElement instanceof OverlayTrigger)
            );

            expect(outerClickContent.parentElement).to.not.be.an.instanceOf(
                OverlayTrigger
            );
            expect(isVisible(outerClickContent)).to.be.true;

            window.dispatchEvent(new Event('resize'));
            window.dispatchEvent(new Event('resize'));

            expect(outerClickContent.parentElement).to.not.be.an.instanceOf(
                OverlayTrigger
            );
            expect(isVisible(outerClickContent)).to.be.true;
        });

        ['inline', 'modal', 'replace'].map((type: string) => {
            it(`opens a popover - [type="${type}"]`, async () => {
                outerTrigger.type = type as Extract<
                    TriggerInteractions,
                    'inline' | 'modal' | 'replace'
                >;
                await elementUpdated(outerTrigger);

                expect(isVisible(outerClickContent)).to.be.false;

                expect(outerButton).to.exist;
                outerButton.click();

                // Wait for the DOM node to be stolen and reparented into the overlay
                await waitForPredicate(
                    () =>
                        !(
                            outerClickContent.parentElement instanceof
                            OverlayTrigger
                        )
                );

                expect(outerClickContent.parentElement).to.not.be.an.instanceOf(
                    OverlayTrigger
                );
                expect(isVisible(outerClickContent)).to.be.true;
            });
        });

        it('does not open a hover popover when a click popover is open', async () => {
            expect(isVisible(outerClickContent), 'outer popover not visible').to
                .be.false;
            expect(isVisible(hoverContent), 'hover popover not visible').to.be
                .false;

            expect(outerButton).to.exist;
            outerButton.click();

            // Wait for the DOM node to be stolen and reparented into the overlay
            await waitUntil(
                () =>
                    !(outerClickContent.parentElement instanceof OverlayTrigger)
            );

            expect(outerClickContent.parentElement).to.not.be.an.instanceOf(
                OverlayTrigger
            );
            expect(isVisible(outerClickContent), 'outer popover visible').to.be
                .true;
            expect(isVisible(hoverContent), 'hover popover still not visible')
                .to.be.false;

            outerButton.dispatchEvent(
                new Event('mouseenter', {
                    bubbles: true,
                    composed: true,
                })
            );

            await nextFrame();
            await waitUntil(
                () => hoverContent.parentElement instanceof OverlayTrigger,
                'hover should not open'
            );

            expect(isVisible(outerClickContent), 'outer popover visible again')
                .to.be.true;
            expect(isVisible(hoverContent), 'hover popover not visible again')
                .to.be.false;
        });

        it('does not open a popover when [disabled]', async () => {
            const root = outerTrigger.shadowRoot
                ? outerTrigger.shadowRoot
                : outerTrigger;
            const triggerZone = root.querySelector(
                '#trigger'
            ) as HTMLDivElement;

            expect(outerTrigger.disabled).to.be.false;
            outerButton.click();
            await waitUntil(
                () =>
                    !(
                        outerClickContent.parentElement instanceof
                        OverlayTrigger
                    ),
                'outer hoverConent stolen and reparented into the overlay'
            );
            expect(outerClickContent.parentElement).to.not.be.an.instanceOf(
                OverlayTrigger
            );
            document.body.click();
            await waitUntil(
                () => outerClickContent.parentElement instanceof OverlayTrigger,
                'outter hoverConent returned to OverlayTrigger'
            );
            expect(outerClickContent.parentElement).to.be.an.instanceOf(
                OverlayTrigger
            );

            outerTrigger.disabled = true;
            await elementUpdated(outerTrigger);

            expect(outerTrigger.disabled).to.be.true;
            expect(outerTrigger.hasAttribute('disabled')).to.be.true;
            outerButton.click();
            await waitUntil(
                () => outerClickContent.parentElement instanceof OverlayTrigger,
                'outter hoverConent never left'
            );
            expect(outerClickContent.parentElement).to.be.an.instanceOf(
                OverlayTrigger
            );
            triggerZone.dispatchEvent(new Event('mouseenter'));
            await waitUntil(
                () => outerClickContent.parentElement instanceof OverlayTrigger,
                'outter hoverConent never left'
            );
            expect(outerClickContent.parentElement).to.be.an.instanceOf(
                OverlayTrigger
            );

            outerTrigger.disabled = false;
            await elementUpdated(outerTrigger);

            expect(outerTrigger.disabled).to.be.false;
            expect(outerTrigger.hasAttribute('disabled')).to.be.false;
            outerButton.click();
            await waitUntil(
                () =>
                    !(
                        outerClickContent.parentElement instanceof
                        OverlayTrigger
                    ),
                'outer hoverConent stolen and reparented into the overlay'
            );
            expect(outerClickContent.parentElement).to.not.be.an.instanceOf(
                OverlayTrigger
            );
            outerButton.click();
            await waitUntil(
                () => outerClickContent.parentElement instanceof OverlayTrigger,
                'outter hoverConent returned to OverlayTrigger'
            );
            expect(outerClickContent.parentElement).to.be.an.instanceOf(
                OverlayTrigger
            );
        });

        it('opens a nested popover', async () => {
            expect(isVisible(outerClickContent)).to.be.false;
            expect(isVisible(innerClickContent)).to.be.false;

            expect(outerButton).to.exist;
            outerButton.click();

            await waitUntil(
                () =>
                    !(
                        outerClickContent.parentElement instanceof
                        OverlayTrigger
                    ),
                'outer hoverConent stolen and reparented into the overlay'
            );

            expect(outerClickContent.parentElement).to.not.be.an.instanceOf(
                OverlayTrigger
            );
            expect(isVisible(outerClickContent)).to.be.true;
            expect(isVisible(innerClickContent)).to.be.false;

            innerButton.click();

            await waitUntil(
                () =>
                    !(
                        innerClickContent.parentElement instanceof
                        OverlayTrigger
                    ),
                'inner hoverConent stolen and reparented into the overlay'
            );

            expect(isVisible(outerClickContent)).to.be.true;
            expect(isVisible(innerClickContent)).to.be.true;
        });

        it('focus previous "modal" when closing nested "modal"', async () => {
            outerTrigger.type = 'modal';
            innerTrigger.type = 'modal';

            expect(isVisible(outerClickContent), 'outer popover starts closed')
                .to.be.false;
            expect(isVisible(innerClickContent), 'inner popover starts closed')
                .to.be.false;

            expect(outerButton).to.exist;
            const outerOpen = oneEvent(outerButton, 'sp-opened');
            outerButton.click();
            await outerOpen;

            await waitUntil(
                () =>
                    !(
                        outerClickContent.parentElement instanceof
                        OverlayTrigger
                    ),
                'outer hoverConent stolen and reparented into the overlay'
            );

            expect(outerClickContent.parentElement).to.not.be.an.instanceOf(
                OverlayTrigger
            );
            expect(isVisible(outerClickContent), 'outer popover opens').to.be
                .true;
            expect(isVisible(innerClickContent), 'inner popover stays closed')
                .to.be.false;

            const innerOpen = oneEvent(innerButton, 'sp-opened');
            innerButton.click();
            await innerOpen;

            await waitUntil(
                () =>
                    !(
                        innerClickContent.parentElement instanceof
                        OverlayTrigger
                    ),
                'inner hoverConent stolen and reparented into the overlay'
            );

            expect(isVisible(outerClickContent), 'outer popover stays open').to
                .be.true;
            expect(isVisible(innerClickContent), 'inner popover opens').to.be
                .true;

            const innerClose = oneEvent(innerButton, 'sp-closed');
            pressEscape();
            await innerClose;

            await waitUntil(
                () => innerClickContent.parentElement instanceof OverlayTrigger,
                'inner hoverConent returned to OverlayTrigger'
            );

            expect(
                document.activeElement === outerClickContent,
                'outer popover recieved focus'
            ).to.be.true;
        });

        it('escape closes an open popover', async () => {
            outerButton.click();

            await waitUntil(
                () =>
                    !(
                        outerClickContent.parentElement instanceof
                        OverlayTrigger
                    ),
                'outer content stolen and reparented'
            );

            innerButton.click();

            await waitUntil(
                () =>
                    !(
                        innerClickContent.parentElement instanceof
                        OverlayTrigger
                    ),
                'inner content stolen and reparented'
            );

            expect(isVisible(outerClickContent)).to.be.true;
            expect(isVisible(innerClickContent)).to.be.true;

            pressSpace();

            expect(isVisible(outerClickContent)).to.be.true;
            expect(isVisible(innerClickContent)).to.be.true;

            pressEscape();

            await waitUntil(
                () => innerClickContent.parentElement instanceof OverlayTrigger,
                'inner content returned'
            );

            expect(isVisible(outerClickContent)).to.be.true;
            expect(isVisible(innerClickContent)).to.be.false;

            pressEscape();

            await waitUntil(
                () => outerClickContent.parentElement instanceof OverlayTrigger,
                'outer content returned'
            );

            expect(isVisible(outerClickContent)).to.be.false;
            expect(isVisible(innerClickContent)).to.be.false;
        });

        it('click closes an open popover', async () => {
            outerButton.click();

            await waitUntil(
                () =>
                    !(
                        outerClickContent.parentElement instanceof
                        OverlayTrigger
                    ),
                'outer content stolen and reparented'
            );

            innerButton.click();

            await waitUntil(
                () =>
                    !(
                        innerClickContent.parentElement instanceof
                        OverlayTrigger
                    ),
                'inner content stolen and reparented'
            );

            expect(isVisible(outerClickContent)).to.be.true;
            expect(isVisible(innerClickContent)).to.be.true;

            // Test that clicking in the overlay content does not close the overlay
            // 200ms is slightly more than the overlay animation fade out time (130ms)
            innerClickContent.click();
            await aTimeout(200);

            expect(isVisible(outerClickContent)).to.be.true;
            expect(isVisible(innerClickContent)).to.be.true;

            document.body.click();

            // Wait for the DOM node to be put back in its original place
            await waitUntil(
                () => innerClickContent.parentElement instanceof OverlayTrigger,
                'outer content returned'
            );

            expect(isVisible(outerClickContent)).to.be.true;
            expect(isVisible(innerClickContent)).to.be.false;

            document.body.click();

            // Wait for the DOM node to be put back in its original place
            await waitUntil(
                () => outerClickContent.parentElement instanceof OverlayTrigger,
                'inner content returned'
            );

            expect(isVisible(outerClickContent)).to.be.false;
            expect(isVisible(innerClickContent)).to.be.false;
        });

        it('opens a hover popover', async () => {
            const root = outerTrigger.shadowRoot
                ? outerTrigger.shadowRoot
                : outerTrigger;
            const triggerZone = root.querySelector(
                '#trigger'
            ) as HTMLDivElement;

            expect(triggerZone).to.exist;
            if (!triggerZone) return;

            expect(outerButton).to.exist;
            expect(hoverContent).to.exist;

            expect(isVisible(hoverContent)).to.be.false;

            const mouseEnter = new MouseEvent('mouseenter');
            triggerZone.dispatchEvent(mouseEnter);

            // Wait for the DOM node to be stolen from its original place
            await waitUntil(
                () => !(hoverContent.parentElement instanceof OverlayTrigger),
                'hoverContent stolen'
            );

            expect(isVisible(hoverContent)).to.be.true;

            const mouseLeave = new MouseEvent('mouseleave');
            triggerZone.dispatchEvent(mouseLeave);

            // Wait for the DOM node to be put back in its original place
            await waitUntil(
                () => hoverContent.parentElement instanceof OverlayTrigger,
                'hoverContent returned'
            );

            expect(isVisible(hoverContent)).to.be.false;
        });

        it('closes a hover popover', async () => {
            const root = outerTrigger.shadowRoot
                ? outerTrigger.shadowRoot
                : outerTrigger;
            const triggerZone = root.querySelector(
                '#trigger'
            ) as HTMLDivElement;

            expect(triggerZone).to.exist;
            if (!triggerZone) return;

            expect(outerButton).to.exist;
            expect(hoverContent).to.exist;

            expect(
                isVisible(hoverContent),
                'hoverContent should not be visible'
            ).to.be.false;

            const mouseEnter = new MouseEvent('mouseenter');
            const mouseLeave = new MouseEvent('mouseleave');
            triggerZone.dispatchEvent(mouseEnter);
            await nextFrame();
            triggerZone.dispatchEvent(mouseLeave);

            await waitUntil(
                () => isVisible(hoverContent) === false,
                'hoverContent should still not be visible'
            );
        });

        it('dispatches events on open/close', async () => {
            const openedSpy = spy();
            const closedSpy = spy();

            outerTrigger.addEventListener('sp-opened', openedSpy);
            outerTrigger.addEventListener('sp-closed', closedSpy);

            outerButton.click();

            await waitUntil(
                () =>
                    !(
                        outerClickContent.parentElement instanceof
                        OverlayTrigger
                    ),
                'outer content stolen and reparented'
            );

            await waitUntil(() => openedSpy.calledOnce, 'opened event sent');

            expect(isVisible(outerClickContent)).to.be.true;
            expect(closed).to.be.false;

            const openedEvent = openedSpy
                .args[0][0] as CustomEvent<OverlayOpenCloseDetail>;
            expect(openedEvent.detail.interaction).to.equal('click');

            document.body.click();

            // Wait for the DOM node to be put back in its original place
            await waitUntil(
                () => outerClickContent.parentElement instanceof OverlayTrigger,
                'inner content returned'
            );

            await waitUntil(() => closedSpy.calledOnce, 'closed event sent');

            const closedEvent = closedSpy
                .args[0][0] as CustomEvent<OverlayOpenCloseDetail>;
            expect(closedEvent.detail.interaction).to.equal('click');

            expect(isVisible(outerClickContent)).to.be.false;
        });
    });
    describe('System interactions', () => {
        afterEach(async () => {
            const triggers = document.querySelectorAll('overlay-trigger');
            const closes: Promise<CustomEvent<unknown>>[] = [];
            triggers.forEach((trigger) => {
                if (trigger.open) {
                    const close = oneEvent(trigger, 'sp-closed');
                    trigger.open = undefined;
                    closes.push(close);
                }
            });
            await Promise.all(closes);
        });
        it('acquires a `color` and `size` from `sp-theme`', async () => {
            const el = await fixture<Theme>(html`
                <sp-theme color="dark">
                    <sp-theme color="light">
                        <overlay-trigger id="trigger" placement="top">
                            <sp-button
                                id="outer-button"
                                variant="primary"
                                slot="trigger"
                            >
                                Show Popover
                            </sp-button>
                            <sp-popover
                                id="outer-popover"
                                dialog
                                slot="click-content"
                                direction="bottom"
                                tip
                                open
                            >
                                Popover content!
                            </sp-popover>
                        </overlay-trigger>
                    </sp-theme>
                </sp-theme>
            `);

            await elementUpdated(el);

            expect(document.querySelector('active-overlay')).to.be.null;

            const button = el.querySelector('sp-button') as Button;
            const opened = oneEvent(button, 'sp-opened');
            button.click();
            await opened;

            await elementUpdated(el);

            const overlay = document.querySelector(
                'active-overlay'
            ) as ActiveOverlay;

            expect(overlay).to.exist;
            expect(overlay.theme.color).to.not.equal('dark');
            expect(overlay.theme.color).to.equal('light');
        });
        it('manages multiple layers of `type="modal"', async () => {
            const el = await fixture(html`
                <overlay-trigger type="modal" placement="none">
                    <sp-button slot="trigger" variant="cta">
                        Toggle Dialog
                    </sp-button>
                    <sp-popover dialog slot="click-content">
                        <overlay-trigger>
                            <sp-button slot="trigger" variant="primary">
                                Toggle Dialog
                            </sp-button>
                            <sp-popover dialog slot="click-content">
                                <overlay-trigger type="modal">
                                    <sp-button
                                        slot="trigger"
                                        variant="secondary"
                                    >
                                        Toggle Dialog
                                    </sp-button>
                                    <sp-popover dialog slot="click-content">
                                        <p>
                                            When you get this deep, this
                                            ActiveOverlay should be the only one
                                            in [slot="open"].
                                        </p>
                                        <p>
                                            All of the rest of the ActiveOverlay
                                            elements should have had their
                                            [slot] attribute removed.
                                        </p>
                                        <p>
                                            Closing this ActiveOverlay should
                                            replace them...
                                        </p>
                                    </sp-popover>
                                </overlay-trigger>
                            </sp-popover>
                        </overlay-trigger>
                    </sp-popover>
                </overlay-trigger>
            `);
            const overlayTriggers = [...el.querySelectorAll('overlay-trigger')];
            let activeOverlays = [
                ...document.querySelectorAll('active-overlay'),
            ];
            const triggers = [
                ...el.querySelectorAll('sp-button[slot="trigger"]'),
            ] as Button[];

            expect(activeOverlays.length, 'no previous overlays').to.equal(0);

            triggers[0]?.click();
            await elementUpdated(overlayTriggers[0]);
            await waitUntil(() => {
                activeOverlays = [
                    ...document.querySelectorAll('active-overlay'),
                ];
                return activeOverlays.length === 1;
            }, 'The first `active-overlay` element has been added.');

            expect(activeOverlays.length).to.equal(1);
            expect(
                activeOverlays[0].slot,
                'first overlay, first time'
            ).to.equal('open');

            triggers[1]?.click();
            await elementUpdated(overlayTriggers[1]);
            await waitUntil(() => {
                activeOverlays = [
                    ...document.querySelectorAll('active-overlay'),
                ];
                return activeOverlays.length === 2;
            }, 'The second `active-overlay` element has been added.');

            expect(
                activeOverlays[0].slot,
                'first overlay, second time'
            ).to.equal('open');
            expect(
                activeOverlays[1].slot,
                'second overlay, second time'
            ).to.equal('open');

            triggers[2]?.click();
            await elementUpdated(overlayTriggers[2]);
            await waitUntil(() => {
                activeOverlays = [
                    ...document.querySelectorAll('active-overlay'),
                ];
                return activeOverlays.length === 3;
            }, 'The third `active-overlay` element has been added.');

            expect(
                activeOverlays[0].hasAttribute('slot'),
                'first overlay, third time'
            ).to.be.false;
            expect(
                activeOverlays[1].hasAttribute('slot'),
                'second overlay, third time'
            ).to.be.false;
            expect(
                activeOverlays[2].slot,
                'third overlay, third time'
            ).to.equal('open');

            await nextFrame();
            document.body.click();
            await elementUpdated(overlayTriggers[1]);
            await waitUntil(() => {
                activeOverlays = [
                    ...document.querySelectorAll('active-overlay'),
                ];
                return activeOverlays.length === 2;
            }, 'The third `active-overlay` element has been removed.');

            await waitUntil(() => {
                return activeOverlays[0].slot === 'open';
            }, 'first overlay, last time');
            expect(
                activeOverlays[1].slot,
                'second overlay, last time'
            ).to.equal('open');
        });
    });
});