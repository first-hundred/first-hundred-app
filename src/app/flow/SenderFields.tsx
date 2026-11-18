import { useWorkspace } from "../lib/store";

export type Sender = { name: string; email: string; role: string; linkedin: string };

const emptySender = (email = ""): Sender => ({ name: "", email, role: "", linkedin: "" });

export function senderProblems(s: Sender) {
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email.trim());
  const linkedinOk = !s.linkedin.trim() || /linkedin\.com\//i.test(s.linkedin);
  return { emailOk, linkedinOk, ready: !!s.name.trim() && emailOk && linkedinOk };
}

/** The sender's identity: used as the film's sender, the reply contact and the email signature. */
export function useSender(fallbackEmail = "") {
  const { ws, set } = useWorkspace();
  const sender = ws.sender ?? emptySender(fallbackEmail);
  return { sender, setSender: (patch: Partial<Sender>) => set({ sender: { ...sender, ...patch } }), ...senderProblems(sender) };
}

export function SenderFields({ fallbackEmail = "" }: { fallbackEmail?: string }) {
  const { sender, setSender, emailOk, linkedinOk } = useSender(fallbackEmail);
  const field = "h-12 w-full min-w-0 border-b border-rule bg-transparent text-base text-ink outline-none placeholder:text-grain/70 focus:border-ink";
  return (
    <section className="fade-in w-full max-w-2xl" aria-labelledby="sender-heading">
      <h2 id="sender-heading" className="text-sm text-grain">Who the films and emails come from</h2>
      <div className="mt-2 grid gap-x-6 sm:grid-cols-2">
        <label className="block"><span className="sr-only">Your name</span>
          <input className={field} value={sender.name} placeholder="Your name" autoComplete="name" onChange={(e) => setSender({ name: e.target.value })} /></label>
        <label className="block"><span className="sr-only">Work email</span>
          <input className={field} type="email" value={sender.email} placeholder="Work email" autoComplete="email" onChange={(e) => setSender({ email: e.target.value })} /></label>
        <label className="block"><span className="sr-only">Your role</span>
          <input className={field} value={sender.role} placeholder="Role, e.g. Co-founder & CEO" autoComplete="organization-title" onChange={(e) => setSender({ role: e.target.value })} /></label>
        <label className="block"><span className="sr-only">LinkedIn profile URL</span>
          <input className={field} type="url" value={sender.linkedin} placeholder="LinkedIn profile URL (optional)" onChange={(e) => setSender({ linkedin: e.target.value })} /></label>
      </div>
      {sender.email && !emailOk && <p className="mt-2 text-sm text-grain">Check the email address.</p>}
      {!linkedinOk && <p className="mt-2 text-sm text-grain">Use your linkedin.com/in/… link.</p>}
    </section>
  );
}
