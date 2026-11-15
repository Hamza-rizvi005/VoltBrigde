import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowUpRight, Battery, Moon, Send, Sun, RotateCcw } from "lucide-react";
import { PageTitle } from "@/components/app-ui";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
import { backupHours, energyBalance, essentialWatts } from "@/lib/energy";

export const Route = createFileRoute("/app/assistant")({
  head: () => ({ meta: [{ title: "Assistant — Volt Bridge" }, { name: "description", content: "Ask plain-English questions about your home energy." }] }),
  component: Assistant,
});

type Msg = { role: "user" | "bot"; text: string; source?: string };
const topics = [
  { name: "Sunny hours", icon: Sun, title: "Put your sunshine to work.", detail: "Explore when to use flexible appliances and what to keep for later.", prompts: ["Which appliances can I move to sunny hours?", "Does my daily plan use more energy than I have?"], link: "/app/planner", action: "Open daily planner" },
  { name: "Power cuts", icon: Battery, title: "Keep the essentials in mind.", detail: "Explore your backup estimate and the appliances that matter during a cut.", prompts: ["How long could my backup last for essentials?", "How can I reduce battery use during a power cut?"], link: "/app/power-cuts", action: "Review power cuts" },
  { name: "Evening plans", icon: Moon, title: "Make a plan for after sunset.", detail: "Think ahead about cooling, extra guests and your battery reserve.", prompts: ["What should I check before running the AC tonight?", "How should I plan extra appliance use for guests tonight?"], link: "/app/events", action: "Plan an event" },
] as const;
const welcome: Msg = { role: "bot", text: "What would you like to plan today? Choose a topic or ask a question about your solar, battery, appliances or power cuts." };

function Assistant() {
  const { state, user } = useStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([welcome]);
  const [q, setQ] = useState("");
  const [topic, setTopic] = useState(0);
  const input = useRef<HTMLTextAreaElement>(null);
  const feed = useRef<HTMLDivElement>(null);
  const sending = useRef(false);
  const selected = topics[topic] ?? topics[0];
  const TopicIcon = selected.icon;
  useEffect(() => {
    if (feed.current) feed.current.scrollTop = feed.current.scrollHeight;
  }, [msgs, busy, error]);
  const choose = (text: string) => { setQ(text); input.current?.focus(); };
  const answer = (text: string) => {
    const s = text.toLowerCase();
    const bal = energyBalance(state.system, state.appliances);
    if (/backup|last|power cut|battery/.test(s)) {
      const hours = backupHours(state.system, essentialWatts(state.appliances));
      return Number.isFinite(hours) ? `The demo household has about ${hours} hours of estimated backup for its listed essentials.\n\nKeep nonessential loads off during a cut and preserve your battery reserve. This estimate assumes constant appliance use with no incoming solar or grid power; actual runtime will vary.` : "Add essential appliances and their power ratings before estimating backup. An empty appliance list does not mean unlimited backup.";
    }
    if (/\bac\b|tonight|guests/.test(s)) return "Before adding evening use, check the appliance's power rating, expected hours and battery energy above your reserve.\n\nUse Event planning to enter the extra loads and compare them with your battery budget. This demo cannot confirm that your AC or event will fit without those details.";
    if (/appliance|sunny|wash|iron|pump/.test(s)) {
      const names = state.appliances.filter(a => a.flexible).map(a => a.name);
      return `${names.length ? `Your flexible appliances include ${names.join(", ")}.` : "Mark appliances as flexible in your appliance list first."}\n\nConsider moving flexible use to hours with available solar. Check actual generation and your inverter limit before running several appliances together; this demo has no live solar readings.`;
    }
    if (/energy|daily|plan|solar/.test(s)) return `Your demo daily budget shows ${bal.solar} kWh of estimated solar and ${bal.load} kWh of planned use. Including usable battery energy, that leaves ${Math.abs(bal.surplus)} kWh ${bal.exceeds ? "shortfall" : "in the budget"}.\n\nA daily total does not establish whether energy is available at the right hour. Review appliance timing and expected cuts in your planner.`;
    return "I can help with household solar, batteries, appliances, power cuts and event planning. Choose a topic above or include your appliance and expected hours in your question. Demo replies are calculated guidance, not a live AI conversation.";
  };
  const send = async (e: FormEvent) => {
    e.preventDefault();
    const question = q.trim();
    if (!question || sending.current) return;
    sending.current = true; setBusy(true); setError(""); setQ("");
    setMsgs(m => [...m, { role: "user", text: question }]);
    try {
      const result = user ? await api<{ answer: string; mode: string }>("/assistant", "POST", { question }) : { answer: answer(question), mode: "demo" };
      const source = result.mode === "gemini" ? "Gemini answer" : result.mode === "demo" ? "Demo guidance" : result.mode === "rules-fallback" ? "Calculated fallback" : "Calculated guidance";
      setMsgs(m => [...m, { role: "bot", text: result.answer, source }]);
    } catch(e) {
      setError(e instanceof Error ? e.message : "Unable to get an answer.");
      setQ(question);
      setMsgs(m => m.slice(0, -1));
    } finally { sending.current = false; setBusy(false); input.current?.focus(); }
  };
  return (
    <div className="assistant-page">
      <PageTitle title="Your energy, made clearer." sub="A little guidance for the way your home actually runs." />
      <div className="assistant-layout">
        <section className="assistant-explore" aria-label="Explore energy topics">
          <div className="assistant-orbit" data-topic={topic} aria-hidden="true"><span /><span /><div><TopicIcon size={35} strokeWidth={1.4} /></div></div>
          <p className="eyebrow">LET’S PLAN YOUR DAY</p>
          <div className="assistant-topics" aria-label="Energy topics">{topics.map((item, i) => <button key={item.name} type="button" aria-pressed={topic === i} onClick={() => setTopic(i)}>{item.name}</button>)}</div>
          <div key={topic} className="assistant-topic-copy"><h2>{selected.title}</h2><p>{selected.detail}</p></div>
          <div className="assistant-prompts">{selected.prompts.map(prompt => <button disabled={busy} key={prompt} onClick={() => choose(prompt)}><span>{prompt}</span><ArrowUpRight size={18} aria-hidden="true" /></button>)}</div>
          <Link className="assistant-plan-link" to={selected.link}>{selected.action}<ArrowUpRight size={16} /></Link>
          <div className="assistant-context"><span>{user ? "YOUR SAVED HOME" : "DEMO HOUSEHOLD"}</span><p>{state.appliances.length} appliances · {state.system.panelKw} kW solar</p><p>Manual inputs · No live inverter readings</p><Link to="/app/setup">Review home details</Link></div>
        </section>
        <section className="assistant-chat" aria-label="Energy assistant conversation">
          <header className="assistant-chat-header"><div><strong>Volt Bridge assistant</strong><p>{busy ? "Preparing your answer…" : "Solar. Backup. Everyday decisions."}</p></div><button type="button" className="assistant-reset" disabled={busy || msgs.length === 1} onClick={() => { setMsgs([welcome]); setError(""); setQ(""); input.current?.focus(); }} aria-label="Clear conversation" title="Clear conversation"><RotateCcw size={18} /></button></header>
          <div ref={feed} className="assistant-messages" role="log" aria-label="Messages" aria-live="polite" aria-relevant="additions">
            {msgs.map((m, i) => <div key={i} className={`assistant-message ${m.role}`}><span className="assistant-message-label">{m.role === "user" ? "YOU" : m.source ?? "YOUR ENERGY ASSISTANT"}</span><p>{m.text}</p></div>)}
            {busy && <div className="assistant-thinking" role="status"><span aria-hidden="true"><i /><i /><i /></span>Working through your question</div>}
          </div>
          <div className="assistant-compose">
            {error && <p role="alert" className="mb-3 text-sm text-destructive">{error} Your question is ready to send again.</p>}
            <form onSubmit={send}>
              <label className="sr-only" htmlFor="energy-question">Your energy question</label>
              <textarea ref={input} id="energy-question" disabled={busy} maxLength={2000} rows={3} value={q} onChange={e => setQ(e.target.value)} placeholder="For example: what should I save battery for tonight?" onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }} />
              <div className="assistant-compose-footer"><span>{q.length}/2000 · Shift + Enter for a new line</span><Button disabled={busy || !q.trim()} type="submit" className="bg-sun">{busy ? "Thinking…" : "Send"}<Send size={16} /></Button></div>
            </form>
            <p className="assistant-disclosure">{user ? "When Gemini is configured, your question and home planning details are sent to Google. Other replies are labeled calculated guidance." : "Demo mode uses sample calculations, not a connected AI model."} Each question is answered using home details, without earlier chat messages. Estimates are not guarantees.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
