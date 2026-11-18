export const fallbackShare = "https://coldopen-nk8o.onrender.com";

/** Keeps the drafted message and makes sure the film share link is in it. */
export function withShareLink(message: string, share: string) {
  const m = message.trim();
  if (m.includes(share)) return m;
  return m ? `${m}\n\n${share}` : share;
}

export function buildMailto(subject: string, body: string) {
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** Opens a Gmail compose window (new tab) instead of the default mail app. */
export function buildGmail(to: string, subject: string, body: string) {
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
