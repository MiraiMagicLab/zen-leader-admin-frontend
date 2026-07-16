/**
 * Public meet base URL for admin ops (copy join link).
 * Override with VITE_MEET_URL when needed; defaults to production meet host.
 */
export function getMeetBaseUrl(): string {
  const configured = import.meta.env.VITE_MEET_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, '');
  }
  return 'https://meet.zenleader.xyz';
}

/**
 * Learner portal base URL (events use relative `/meet?roomId=` links).
 * Override with VITE_PORTAL_URL when needed.
 */
export function getPortalBaseUrl(): string {
  const configured = import.meta.env.VITE_PORTAL_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, '');
  }
  return 'https://portal.zenleader.xyz';
}

/** Builds a shareable meet room URL from a room code (direct meet host). */
export function buildMeetRoomUrl(roomCode: string): string {
  return `${getMeetBaseUrl()}/${encodeURIComponent(roomCode.trim())}`;
}

/**
 * Absolute learner join URL. Prefers an absolute `liveLink` when provided;
 * otherwise builds portal `/meet?roomId=` from room code.
 */
export function buildAbsoluteJoinUrl(options: {
  roomCode?: string | null;
  liveLink?: string | null;
}): string | null {
  const liveLink = options.liveLink?.trim();
  if (liveLink) {
    if (/^https?:\/\//i.test(liveLink)) {
      return liveLink;
    }
    if (liveLink.startsWith('/')) {
      return `${getPortalBaseUrl()}${liveLink}`;
    }
  }
  const roomCode = options.roomCode?.trim();
  if (roomCode) {
    return `${getPortalBaseUrl()}/meet?roomId=${encodeURIComponent(roomCode)}`;
  }
  return null;
}
