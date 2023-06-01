/*
Copyright 2023 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import { OverlayBase as Overlay } from './OverlayBase.js';

const supportsPopover = 'showPopover' in document.createElement('div');

class OverlayStack {
    private get document(): Document {
        return this.root.ownerDocument /* c8 ignore next */ || document;
    }

    private root: HTMLElement = document.body;

    stack: Overlay[] = [];

    constructor() {
        this.bindEvents();
    }

    bindEvents(): void {
        this.document.addEventListener('pointerup', this.handleClick);
        this.document.addEventListener('keydown', this.handleKeydown);
    }

    private closeOverlay(overlay: Overlay): void {
        const overlayIndex = this.stack.indexOf(overlay);
        if (overlayIndex > -1) {
            this.stack.splice(overlayIndex, 1);
        }
        overlay.open = false;
    }

    /**
     * Close all overlays that are not ancestors of this click event
     *
     * @param event {ClickEvent}
     */
    handleClick = (event: Event): void => {
        if (!this.stack.length) return;

        const composedPath = event.composedPath();
        const nonAncestorOverlays = this.stack.filter((overlay) => {
            const inStack = composedPath.find(
                (el) => el === overlay || el === overlay?.triggerElement
            );
            return !inStack && !overlay.shouldPreventClose();
        }) as Overlay[];
        nonAncestorOverlays.reverse();
        nonAncestorOverlays.forEach((overlay) => {
            this.closeOverlay(overlay);
            let parentToClose = overlay.parentOverlayToForceClose;
            while (parentToClose) {
                this.closeOverlay(parentToClose);
                parentToClose = parentToClose.parentOverlayToForceClose;
            }
        });

        // let reverseIndex = -1;
        // let overlay = this.stack.at(reverseIndex);
        // if (overlay?.shouldPreventClose()) return;

        // let shouldClose;
        // while (overlay && !shouldClose) {
        //     shouldClose =
        //         overlay.shouldPreventClose() ||
        //         !composedPath.find(
        //             (el) => el === overlay || el === overlay?.triggerElement
        //         );
        //     if (!shouldClose) {
        //         reverseIndex -= 1;
        //         overlay = this.stack.at(reverseIndex);
        //     }
        // }
        // if (!shouldClose || !overlay) {
        //     return;
        // }

        // this.closeOverlay(overlay);
        // let parentToClose = overlay.parentOverlayToForceClose;
        // while (parentToClose) {
        //     this.closeOverlay(parentToClose);
        //     parentToClose = parentToClose.parentOverlayToForceClose;
        // }
    };

    handleBeforetoggle = (event: Event): void => {
        const { target, newState: open } = event as Event & {
            newState: string;
        };
        if (open === 'open') return;
        this.closeOverlay(target as Overlay);
    };

    private handleKeydown = (event: KeyboardEvent): void => {
        if (event.code !== 'Escape') return;
        if (supportsPopover) return;
        if (!this.stack.length) return;

        const last = this.stack.at(-1);
        if (!last) return;
        this.closeOverlay(last);
    };

    /**
     * When overlays are added manage the open state of exisiting overlays appropriately:
     * - 'modal': should close other overlays
     * - 'page': should close other overlays
     * - 'hint': shouldn't close other overlays
     * - 'auto': should close other 'auto' overlays and other 'hint' overlays, but not 'manual' overlays
     * - 'manual': shouldn't close other overlays
     */
    add(overlay: Overlay): void {
        if (this.stack.includes(overlay)) {
            const overlayIndex = this.stack.indexOf(overlay);
            if (overlayIndex > -1) {
                this.stack.splice(overlayIndex, 1);
                this.stack.push(overlay);
            }
            return;
        }
        if (
            overlay.type === 'auto' ||
            overlay.type === 'modal' ||
            overlay.type === 'page'
        ) {
            // manage closing open overlays
            const queryPathEventName = 'sp-overlay-query-path';
            const queryPathEvent = new Event(queryPathEventName, {
                composed: true,
                bubbles: true,
            });
            overlay.addEventListener(
                queryPathEventName,
                (event: Event) => {
                    const path = event.composedPath();
                    this.stack.forEach((overlayEl) => {
                        const inPath = path.find((el) => el === overlayEl);
                        if (!inPath && overlayEl.type !== 'manual') {
                            this.closeOverlay(overlayEl);
                        }
                    });
                },
                { once: true }
            );
            overlay.dispatchEvent(queryPathEvent);
        } else if (overlay.type === 'hint') {
            this.stack.forEach((overlayEl) => {
                if (overlayEl.type === 'hint') {
                    this.closeOverlay(overlayEl);
                }
            });
        }
        requestAnimationFrame(() => {
            this.stack.push(overlay);
            overlay.addEventListener('beforetoggle', this.handleBeforetoggle, {
                once: true,
            });
        });
    }

    remove(overlay: Overlay): void {
        this.closeOverlay(overlay);
    }
}

export const overlayStack = new OverlayStack();