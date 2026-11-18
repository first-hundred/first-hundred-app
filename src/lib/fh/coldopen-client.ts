// Server-only: keep apiKey in the server function's secrets.
export interface InterviewAnswers {
  website: string; pitch: string;
  buyer: { role: string; companyType: string; size?: string };
  points: string[]; proof: { value: string; label: string }[];
  ask: string; contact: string;
}
export interface SalesProfile {
  preset: 'sales' | 'candidate' | 'recruiter' | 'hiring';
  sender: { name: string; company?: string; role?: string };
  offer: string; points: string[]; proof: { value: string; label: string }[];
  cta: { line: string; contact: string; book?: string };
}
export interface PitchProfileInput {
  candidateText?: string; candidateName?: string; role?: string;
  recruiter: { name: string; company?: string; contact: string; book?: string };
}
export interface FilmDto {
  id: string; status: 'queued' | 'running' | 'waiting' | 'succeeded' | 'failed' | 'cancelled';
  progress?: { stage?: string; label?: string } | null;
  files?: { film?: string | null; poster?: string | null; gif?: string | null; sheet?: string | null } | null;
  share?: string | null; company?: string | null;
}
export interface ViewSummary {
  opens: number; viewers: number; plays: number; finishes: number; clicks: number;
  bestSeconds: number; firstPlayAt?: string | null; lastSeen?: string | null;
}
export interface FilmMessages { email: { subject: string; body: string }; linkedin: string; followUp: string; [key: string]: unknown }
export type OutreachStatus = 'sent' | 'replied' | 'interview' | 'no_reply' | null;
const line = (value: string, max: number) => value.replace(/\s+/g, ' ').trim().slice(0, max);
function required(value: string, min: number, max: number, label: string): string {
  const result = line(value, max);
  if (result.length < min) throw new Error(`Add ${label}.`);
  return result;
}
// This endpoint currently drafts RECRUITER profiles, not sales profiles.
// For a customer film, prefer interviewToSalesProfile even if this call succeeds.
export function interviewToProfileInput(a: InterviewAnswers): PitchProfileInput {
  const candidateText = [a.pitch, `Website: ${a.website}`, `Buyer: ${a.buyer.role}, ${a.buyer.companyType}, ${a.buyer.size || ''}`,
    ...a.points, ...a.proof.map(p => `${p.value} ${p.label}`), `Ask: ${a.ask}`, `Contact: ${a.contact}`].join('\n').slice(0, 30000);
  if (candidateText.length < 80) throw new Error('Add more detail to the pitch before drafting a profile.');
  return { candidateText, recruiter: { name: 'Founder', contact: required(a.contact, 3, 80, 'a contact address') } };
}
export function interviewToSalesProfile(a: InterviewAnswers, sender: SalesProfile['sender']): SalesProfile {
  const points = a.points.map(p => line(p, 120)).filter(p => p.length >= 3).slice(0, 6);
  const proof = a.proof.map(p => ({ value: line(p.value, 12), label: line(p.label, 60) }))
    .filter(p => p.value.length >= 1 && p.label.length >= 3).slice(0, 8);
  if (points.length < 2) throw new Error('Add at least two selling points.');
  if (!proof.length) throw new Error('Add one real proof point, such as pilots or design partners.');
  return { preset: 'sales', sender: { name: required(sender.name, 1, 80, 'the sender name'),
    ...(sender.company ? { company: line(sender.company, 80) } : {}), ...(sender.role ? { role: line(sender.role, 80) } : {}) },
    offer: required(a.pitch, 3, 120, 'a pitch'), points, proof,
    cta: { line: required(a.ask, 3, 60, 'an ask'), contact: required(a.contact, 3, 80, 'a contact address') } };
}
export function makeColdopen({ baseUrl, apiKey }: { baseUrl: string; apiKey: string }) {
  if (!apiKey.trim()) throw new Error('Add the coldopen API key on the server.');
  let base: string;
  try { const u = new URL(baseUrl); if (!/^https?:$/.test(u.protocol)) throw 0; base = u.href.replace(/\/$/, ''); }
  catch { throw new Error('Add a valid coldopen server URL.'); }
  async function request<T>(path: string, method = 'GET', body?: unknown, ref?: string): Promise<T> {
    let response: Response;
    try { response = await fetch(base + path, { method, headers: { Authorization: `Bearer ${apiKey}`,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(ref ? { 'Idempotency-Key': ref } : {}) },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(120000) }); }
    catch { throw new Error('Could not reach coldopen. Try again shortly.'); }
    if (response.status === 401) throw new Error('Coldopen rejected the API key. Check the server secret.');
    if (response.status === 429) throw new Error('Coldopen is busy. Wait a moment and try again.');
    if (!response.ok) throw new Error(`Coldopen could not complete the request (${response.status}).`);
    if (response.status === 204) return undefined as T;
    try { return await response.json() as T; } catch { throw new Error('Coldopen returned an unreadable response.'); }
  }
  const filmPath = (id: string) => { if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) throw new Error('Choose a film first.'); return `/v1/films/${id}`; };
  return {
    pitchProfile: (input: PitchProfileInput) => request<SalesProfile>('/v1/pitch/profile', 'POST', input),
    createFilm: (input: { url: string; profile: SalesProfile; format?: 'square' | 'landscape' | 'portrait'; ref?: string }) =>
      request<FilmDto>('/v1/films', 'POST', { ...input, format: input.format || 'square' }, input.ref),
    getFilm: (id: string) => request<FilmDto>(filmPath(id)),
    views: (id: string) => request<{ summary: ViewSummary; sessions?: unknown[] }>(filmPath(id) + '/views'),
    messages: (id: string) => request<FilmMessages>(filmPath(id) + '/messages'),
    founders: (id: string) => request<{ domain: string; people: Record<string, unknown>[] }>(filmPath(id) + '/founders', 'POST'),
    review: (id: string) => request<{ ready: boolean; [key: string]: unknown }>(filmPath(id) + '/review'),
    setOutreach: (id: string, status: OutreachStatus) => request<unknown>(filmPath(id) + '/outreach', 'PUT', { status }),
  };
}
export function filmStageLine(film: FilmDto): string {
  if (film.progress?.label?.trim()) return line(film.progress.label, 100);
  const labels: Record<string, string> = { queued: 'Waiting to start', running: 'Making your film', waiting: 'Waiting for the next step', succeeded: 'Your film is ready', failed: 'Film failed. Try again.', cancelled: 'Film cancelled' };
  return film.progress?.stage ? line(film.progress.stage.replace(/[_-]/g, ' '), 100) : labels[film.status];
}
export function viewsLine(summary: ViewSummary): string {
  if (summary.bestSeconds > 0) return `watched ${Math.round(summary.bestSeconds)} s`;
  if (summary.plays > 0) return 'started watching';
  return summary.opens > 0 ? 'opened, not played' : '';
}
