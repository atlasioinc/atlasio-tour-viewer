// viewer-overlay.ts
// ─────────────────────────────────────────────
// ATL-3DTOUR-09: Buyer-facing viewer chrome
// ATL-3DTOUR-10: Branded / unbranded variant
//
// Renders over the 3D canvas:
//   - Loading state (spinner + progress bar)
//   - Agent info card (branded mode only)
//   - Room selector (populated from splat metadata)
//   - Touch/click hint on first load
// ─────────────────────────────────────────────

import { ViewerParams } from '../viewer-mode';

export class ViewerOverlay {
    private container: HTMLDivElement;
    private loadingEl: HTMLDivElement;
    private agentEl: HTMLDivElement | null = null;
    private hintEl: HTMLDivElement;

    constructor(params: ViewerParams) {
        this.container = document.createElement('div');
        this.container.id = 'viewer-overlay';

        // Loading state
        this.loadingEl = this.buildLoading();
        this.container.appendChild(this.loadingEl);

        // Agent info (branded mode only)
        if (!params.unbranded && (params.agentName || params.isDemo)) {
            this.agentEl = this.buildAgentCard(params);
            this.container.appendChild(this.agentEl);
        }

        // Drag hint
        this.hintEl = this.buildHint();
        this.container.appendChild(this.hintEl);

        document.body.appendChild(this.container);
    }

    private buildLoading(): HTMLDivElement {
        const el = document.createElement('div');
        el.id = 'viewer-loading';
        el.innerHTML = `
            <div class="viewer-loading-inner">
                <div class="viewer-spinner"></div>
                <div class="viewer-loading-text">Loading tour…</div>
                <div class="viewer-progress-bar"><div class="viewer-progress-fill" id="viewer-progress-fill"></div></div>
            </div>
        `;
        return el;
    }

    private buildAgentCard(params: ViewerParams): HTMLDivElement {
        const name = params.isDemo ? 'Sarah Johnson' : (params.agentName ?? '');
        const phone = params.isDemo ? '+1 (303) 555-0182' : (params.agentPhone ?? '');
        const photo = params.isDemo
            ? 'https://ui-avatars.com/api/?name=Sarah+Johnson&background=003DC3&color=fff&size=48'
            : (params.agentPhoto ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=003DC3&color=fff&size=48`);

        const el = document.createElement('div');
        el.id = 'viewer-agent-card';
        el.innerHTML = `
            <img class="viewer-agent-photo" src="${photo}" alt="${name}" />
            <div class="viewer-agent-info">
                <div class="viewer-agent-name">${name}</div>
                <div class="viewer-agent-label">Listing Agent · Atlasio</div>
            </div>
            ${phone ? `<a class="viewer-agent-cta" href="tel:${phone}">Contact</a>` : ''}
        `;
        return el;
    }

    private buildHint(): HTMLDivElement {
        const el = document.createElement('div');
        el.id = 'viewer-hint';
        el.innerHTML = `<span>Drag to look &nbsp;·&nbsp; Tap floor to move</span>`;
        return el;
    }

    // Called by main loader with 0–1 progress
    setProgress(progress: number) {
        const fill = document.getElementById('viewer-progress-fill');
        if (fill) fill.style.width = `${Math.round(progress * 100)}%`;
    }

    // Call when splat is fully loaded and rendered
    onReady() {
        this.loadingEl.classList.add('viewer-loading--hidden');
        setTimeout(() => {
            this.hintEl.classList.add('viewer-hint--visible');
            setTimeout(() => this.hintEl.classList.remove('viewer-hint--visible'), 3500);
        }, 400);
    }
}
