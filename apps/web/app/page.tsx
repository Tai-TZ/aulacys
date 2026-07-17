"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { cn } from "@/lib/cn";
import { sendChat } from "@/lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
}

function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      /* ignore */
    }
  }

  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
      {dark ? <Sun size={16} /> : <Moon size={16} />}
    </Button>
  );
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setLoading(true);
    try {
      const { response } = await sendChat(text);
      setMessages((m) => [...m, { role: "assistant", content: response }]);
    } catch {
      // Demo-proof: never crash the UI on a backend error.
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "⚠️ Could not reach the server." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col p-4">
      <header className="flex items-center justify-between py-4">
        <h1 className="text-2xl font-bold">App</h1>
        <ThemeToggle />
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto">
        {messages.length === 0 && (
          <p className="text-muted-foreground">Start the conversation…</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
            <span
              className={cn(
                "inline-block max-w-[80%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm",
                m.role === "user"
                  ? "bg-primary text-on-primary"
                  : "border border-border bg-card text-card-foreground",
              )}
            >
              {m.content}
            </span>
          </div>
        ))}
        {loading && <div className="text-left text-muted-foreground">…</div>}
      </div>

      <form onSubmit={handleSend} className="flex gap-2 py-4">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message…"
        />
        <Button type="submit" disabled={loading}>
          Send
        </Button>
      </form>
    </main>
  );
}
