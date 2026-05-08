// viewer-mode.ts
// ─────────────────────────────────────────────
// ATL-3DTOUR-09: TourViewerScreen (web layer)
// ATL-3DTOUR-10: Branded / unbranded URL routing
//
// Activated when URL contains ?viewer=1 or ?splat=<url>
// Params:
//   splat=<url>         CDN URL of the .ply splat file
//   unbranded=1         Strip agent info (for MLS syndication)
//   agent_name=<str>    Agent display name
//   agent_photo=<url>   Agent headshot URL
//   agent_phone=<str>   Agent phone (tel: link)
//   demo=1              Load bundled sample splat (no CDN required)
// ─────────────────────────────────────────────

export interface ViewerParams {
    isViewerMode: boolean;
    splatUrl: string | null;
    unbranded: boolean;
    agentName: string | null;
    agentPhoto: string | null;
    agentPhone: string | null;
    isDemo: boolean;
}

// Demo splat — bundled sample for @demo state (ATL-3DTOUR-09)
const DEMO_SPLAT_URL = '/static/sample/demo-tour.ply';

export const getViewerParams = (): ViewerParams => {
    const params = new URLSearchParams(window.location.search);
    const hasSplat = params.has('splat');
    const isViewer = params.has('viewer') || hasSplat;
    const isDemo = params.has('demo') || (!hasSplat && isViewer);

    return {
        isViewerMode: isViewer,
        splatUrl: hasSplat ? decodeURIComponent(params.get('splat')!) : (isDemo ? DEMO_SPLAT_URL : null),
        unbranded: params.get('unbranded') === '1',
        agentName: params.get('agent_name') ? decodeURIComponent(params.get('agent_name')!) : null,
        agentPhoto: params.get('agent_photo') ? decodeURIComponent(params.get('agent_photo')!) : null,
        agentPhone: params.get('agent_phone') ? decodeURIComponent(params.get('agent_phone')!) : null,
        isDemo
    };
};

// Apply viewer mode to the DOM — hides editor chrome, adds viewer class
export const applyViewerMode = () => {
    document.documentElement.classList.add('viewer-mode');
    document.title = 'Atlasio 3D Tour';
};

