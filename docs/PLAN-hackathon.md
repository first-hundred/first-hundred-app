# Hackathon plan (17 Nov 2026)

Team doc with comments: https://claude.ai/artifact/DoJTUPKpG7i7TzjxvHXZAE (the live version; this file is a snapshot for agents).

Tonight we build, in Lovable, a tool that takes a founder from zero to their first 100 customers: a live voice interview, then leads, then a 30-second film per prospect in the prospect's own brand (coldopen). Build 3:45 to 5:45 pm, demos 6:00 pm.

## Decisions (Jakob's words, as typed)

| Topic | Decision | What it means |
|---|---|---|
| Demo flow | "from interview, (maybe finding leads) to final video out" | Interview, then leads, then the film |
| Build rule | "forntent and what can be done via lovable should be doen via lovable"; "main building (frotnend) and other capabilites that can be built o lovable will be built on lovable" | Fresh Lovable project; local or Codex work only for what Lovable can't do |
| Interview | "i would love live interview!" | Lovable Live voice, so a fresh Lovable project on TanStack Start |
| Scope | "Ask all 3, demo customers" | Buttons for Customers, Investors, Hires; only Customers runs end to end |
| Other paths | "yes" | Show the three buttons, one line each, run only Customers |
| Pushback | "a little poushback on too vague pitches would be great!" | One follow-up when an answer is vague |
| Leads | "lets make it look like A but defautl to D (+ E as an option)" | Looks like a startup finder; filled from tonight's event page; paste box for own companies |
| Demo founder | "if i play a founder ill play a german one" | Jakob plays a German founder |
| Prep story | "we build upon it heavily" | Say up front: coldopen existed, tonight we built on it |
| Call rehearsal | "call rehersal i think shoudl be out" | Cut |
| "Made with coldopen" line | "no" | Not on films |
| Film audio | "tbd" | Open |

## Demo flow

1. Tap a goal: Customers, Investors, Hires, plus the website (typed).
2. Live voice interview: 4 to 5 questions, about 60 s, one push back on vague answers.
3. Check card: pitch, buyer, points, proof, ask; the founder fixes anything misheard.
4. Leads: event page by default, plus paste your own URLs; the founder ticks companies.
5. A 30-second film per ticked company, in its brand; the judge's film is pre-rendered.
6. Count to 100: moves only on a yes.

## Interview questions (Customers path)

| Question | Feeds |
|---|---|
| Give me your elevator pitch in two sentences. | Film's main line |
| Who buys first? Their role, and what kind of company. | Lead matching |
| Why do they buy? What matters most to them? | Film's 2 to 4 points |
| What proof do you have? Customers, pilots, any number. | Film's proof ("3 design partners piloting" counts) |
| What do you want from them, and how do they reach you? | Film's ask, plus email or booking link |

Investors: pitch, strongest number, how much and from whom, why now. Hires: role, CV or LinkedIn (upload), which companies or teams, why you.

## Leads

A lead is a company with its URL, because coldopen builds the film from the buyer's site. Default source: the event page import (`event-signals`, already built). Paste box for the founder's own URLs. Not in the demo: web search (Client Work search + AI filter, needs a Serper key), coldopen's YC search, Hacker News and Reddit posts (no company URLs).

## Who builds what

| Part | Where | By |
|---|---|---|
| Screens, voice interview, check card, leads list, film view, counter | Lovable, fresh project | Jakob + Ashwin |
| Server functions: event import, coldopen calls, interview extraction | Lovable, reusing logic from `supabase/functions/_shared/` | Pasted into Lovable |
| Films | coldopen API | Ashwin |
| Lovable prompts, interview script | Prep | Jakob |

Before 3:45 pm:
- [ ] Ashwin: coldopen API key on Render, shared privately
- [ ] Ashwin: wake the server, pre-render films for lovable.dev, First Ten Advisory, jpmorgan.com, sacc-sf.org
- [ ] Ashwin: confirm the fresh Lovable project
- [ ] Jakob: Lovable prompts in order, interview script, pick the German startup
- [ ] Both: 200 credits on the build account; pitch roles

## Open questions

- Pitch roles (Jakob + Ashwin)
- Fresh Lovable project confirmed (Ashwin)
- Which German startup Jakob plays
- Film audio: samples first. Picks: music = Lyria clip (`lyria-3-clip-preview`, about $0.04) or Stable Audio 2.5; voiceover = Gemini TTS (`gemini-3.8-flash-tts`) or Deepgram Aura-2
- On site: judges, pitch length, Live voice cost per minute

## Risks

| Risk | Fallback |
|---|---|
| Film render takes 2 to 3 min; Render server sleeps | Pre-render every film shown; wake at 5:30 pm |
| Live voice fails or eats credits | Typed answers on the same check card |
| Speech misheard | Check card before searching |
| Event import blocked | Paste box with judges' URLs ready |
| "Did you build this tonight?" | Say it up front |
