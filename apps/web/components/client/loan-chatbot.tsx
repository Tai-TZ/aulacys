"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowRight,
  Bot,
  Clock3,
  History,
  Maximize2,
  MessageCircle,
  Minimize2,
  MoreHorizontal,
  Paperclip,
  PanelLeft,
  Plus,
  Send,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { Button, Textarea } from "@/components/ui";
import { sendChat } from "@/lib/api";
import { cn } from "@/lib/cn";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const suggestions = [
  ["Vay mua nhà", "Tôi muốn vay 2 tỷ mua nhà, thu nhập gia đình 60 triệu/tháng"],
  ["Khả năng trả nợ", "Giúp tôi ước tính khoản trả hàng tháng cho khoản vay 800 triệu"],
  ["Vay mua ô tô", "Tư vấn khoản vay mua ô tô trị giá 1,2 tỷ"],
  ["Chuẩn bị hồ sơ", "Tôi cần chuẩn bị giấy tờ gì để đăng ký vay?"],
];

export function LoanChatbot() {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (!open) setExpanded(false);
  }, [open]);

  async function handleSend(event: React.FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages((items) => [...items, { role: "user", content: text }]);
    setLoading(true);
    try {
      const { response } = await sendChat(text);
      setMessages((items) => [...items, { role: "assistant", content: response }]);
    } catch {
      setMessages((items) => [
        ...items,
        { role: "assistant", content: "Hệ thống đang chạy chế độ dự phòng. Yêu cầu của bạn đã được ghi nhận để chuyên gia SHB hỗ trợ." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function selectSuggestion(prompt: string) {
    setInput(prompt);
    window.setTimeout(() => document.getElementById("floating-loan-request")?.focus(), 0);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-full bg-brand p-3 text-on-primary shadow-chat-launcher transition hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/25 sm:bottom-7 sm:right-7 sm:px-5"
        aria-label="Mở trợ lý khoản vay SHB"
      >
        <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-on-primary/15"><MessageCircle size={22}/><span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full border-2 border-brand bg-chat-online"/></span>
        <span className="hidden text-left sm:block"><span className="block text-sm font-semibold">Trợ lý khoản vay</span><span className="block text-xs text-on-primary/75">Hỏi SHB ngay</span></span>
      </button>
    );
  }

  return (
    <div className={cn("fixed z-50", expanded ? "inset-0 bg-chat-backdrop p-0 sm:p-5" : "bottom-0 left-0 right-0 top-0 sm:inset-auto sm:bottom-6 sm:right-6")} role="dialog" aria-modal="true" aria-label="Trợ lý khoản vay SHB">
      <div className={cn(
        "grid h-full overflow-hidden border border-chat-border bg-chat-canvas shadow-chat transition-all",
        expanded ? "mx-auto max-w-[1440px] rounded-none sm:h-[calc(100vh-2.5rem)] sm:rounded-[28px] lg:grid-cols-[260px_1fr]" : "rounded-none sm:h-[680px] sm:w-[430px] sm:rounded-[24px]",
      )}>
        {expanded && (
          <aside className="hidden flex-col border-r border-chat-border bg-chat-sidebar p-4 lg:flex">
            <div className="flex items-center justify-between px-2 py-1"><Image src="/shb/logo.svg" alt="SHB" width={74} height={34}/><PanelLeft size={18} className="text-muted-foreground"/></div>
            <Button className="mt-5 w-full justify-start rounded-xl bg-card text-navy shadow-sm" variant="outline"><Plus size={18}/> Cuộc trò chuyện mới</Button>
            <div className="mt-7 flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><History size={14}/> Gần đây</div>
            <nav className="mt-3 space-y-1 text-sm">{["Tư vấn vay mua nhà", "Tính khả năng trả nợ", "Điều kiện vay mua ô tô"].map((title, index) => <button key={title} className={cn("w-full truncate rounded-xl px-3 py-2.5 text-left", index === 0 ? "bg-card font-medium text-navy shadow-sm" : "text-muted-foreground hover:bg-card")}>{title}</button>)}</nav>
            <div className="mt-auto rounded-2xl border border-chat-border bg-card p-3"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-on-primary"><UserRound size={17}/></span><div><p className="text-sm font-semibold text-navy">Khách hàng SHB</p><p className="text-xs text-muted-foreground">Tài khoản cá nhân</p></div><MoreHorizontal className="ml-auto text-muted-foreground" size={18}/></div></div>
          </aside>
        )}

        <div className="flex min-h-0 min-w-0 flex-col">
          <header className="flex h-16 shrink-0 items-center justify-between border-b border-chat-border bg-card px-4">
            <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-on-primary"><Sparkles size={19}/></span><div><p className="text-sm font-semibold text-navy">Trợ lý khoản vay SHB</p><p className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="h-2 w-2 rounded-full bg-chat-online"/> Sẵn sàng hỗ trợ</p></div></div>
            <div className="flex items-center gap-1">
              <Button type="button" variant="ghost" size="icon" onClick={() => setExpanded((value) => !value)} aria-label={expanded ? "Thu nhỏ chatbot" : "Mở rộng chatbot"}>{expanded ? <Minimize2 size={18}/> : <Maximize2 size={18}/>}</Button>
              <Button type="button" variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Đóng chatbot"><X size={20}/></Button>
            </div>
          </header>

          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto scroll-smooth px-4 sm:px-6">
            {messages.length === 0 ? (
              <div className={cn("mx-auto flex min-h-full max-w-3xl flex-col py-8", expanded ? "justify-center" : "justify-start pt-6 sm:pt-10")}>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-on-primary shadow-brand"><Bot size={22}/></div>
                <h2 className={cn("mt-5 font-light tracking-tight text-navy", expanded ? "text-4xl" : "text-[22px] leading-snug sm:text-2xl")}>Xin chào, tôi có thể giúp gì?</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Mô tả nhu cầu vay và kế hoạch tài chính của bạn để nhận tư vấn phù hợp.</p>
                <div className={cn("mt-6 grid gap-2.5", expanded && "sm:grid-cols-2")}>
                  {suggestions.map(([title, prompt]) => <button key={title} onClick={() => selectSuggestion(prompt)} className="group rounded-2xl border border-chat-border bg-card p-3.5 text-left transition hover:border-brand/40 hover:shadow-sm active:scale-[0.98]"><span className="text-sm font-semibold text-navy">{title}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{prompt}</span><ArrowRight className="mt-2 text-brand opacity-0 transition group-hover:opacity-100" size={15}/></button>)}
                </div>
              </div>
            ) : (
              <div className="mx-auto max-w-3xl space-y-6 py-6">
                {messages.map((message, index) => message.role === "user" ? <div key={index} className="flex justify-end"><div className="max-w-[88%] rounded-[20px] rounded-br-md bg-chat-user px-4 py-3 text-sm leading-6 text-navy">{message.content}</div></div> : <div key={index} className="flex gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand text-on-primary"><Sparkles size={15}/></span><div><p className="mb-1 text-xs font-semibold text-navy">SHB Digital Expert</p><p className="whitespace-pre-wrap text-sm leading-6 text-foreground">{message.content}</p></div></div>)}
                {loading && <div className="flex gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand text-on-primary"><Sparkles size={15}/></span><div><p className="text-xs font-semibold text-navy">Đang phân tích yêu cầu</p><div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><span className="h-2 w-2 animate-pulse rounded-full bg-brand"/> Các chuyên gia đang phối hợp...</div></div></div>}
              </div>
            )}
          </div>

          <div className="shrink-0 bg-chat-canvas px-3 pb-3 pt-2 sm:px-5 sm:pb-5">
            <form onSubmit={handleSend} className="mx-auto max-w-3xl rounded-[20px] border border-chat-border bg-card p-2.5 shadow-composer focus-within:border-brand/50 focus-within:ring-4 focus-within:ring-brand/10">
              <label htmlFor="floating-loan-request" className="sr-only">Nhập câu hỏi về khoản vay</label>
              <Textarea id="floating-loan-request" value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} rows={2} className="max-h-32 min-h-14 resize-none border-0 bg-transparent px-2 py-2 text-sm shadow-none focus-visible:ring-0" placeholder="Hỏi về khoản vay của bạn..."/>
              <div className="flex items-center justify-between"><div className="flex items-center gap-1"><Button type="button" variant="ghost" size="icon" aria-label="Đính kèm hồ sơ"><Paperclip size={17}/></Button>{expanded && <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex"><Clock3 size={13}/> Phản hồi có kiểm chứng</span>}</div><Button type="submit" size="icon" disabled={loading || !input.trim()} className="rounded-full" aria-label="Gửi tin nhắn"><Send size={16}/></Button></div>
            </form>
            <p className="mt-2 text-center text-[10px] text-muted-foreground">Thông tin chỉ mang tính tham khảo.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
