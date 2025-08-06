"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { cn } from "@/utils/cn";

const files = ["README.md", "community.tsx", "insights.json"];
const markdownContent = [
	"# Welcome to VAI",
	"",
	"Where AI Engineers Level Up Together 🚀",
	"",
	"## Quick Start",
	"```bash",
	"$ npm install @vai/community",
	"$ vai connect --discord",
	"```",
	"",
	"## What You'll Find Here",
	"• Curated AI resources and tools",
	"• Production-ready code snippets",
	"• Weekly community challenges",
	"• Direct access to industry experts",
	"",
	"Join 500+ engineers building the future →",
];

type Chat = {
	role: "user" | "assistant" | "system";
	content: string;
	timestamp?: string;
};

export default function IDELanding() {
	const [typed, setTyped] = useState<string>("");
	const [messages, setMessages] = useState<Chat[]>([]);
	const [activeFile, setActiveFile] = useState(0);
	const command = "$ vai connect --discord";

	// typing animation for terminal command
	useEffect(() => {
		let i = 0;
		const id = setInterval(() => {
			setTyped(command.slice(0, i + 1));
			i += 1;
			if (i === command.length) {
				clearInterval(id);
			}
		}, 60);
		return () => clearInterval(id);
	}, []);

	// play a scripted conversation in chat pane
	useEffect(() => {
		const convo: Chat[] = [
			{
				role: "system",
				content: "Welcome to VAI Community Chat",
				timestamp: "9:42 AM",
			},
			{
				role: "user",
				content: "Just shipped my first AI feature to production! 🎉",
				timestamp: "9:43 AM",
			},
			{
				role: "assistant",
				content:
					"Congrats! What stack did you use? Would love to hear about your architecture choices.",
				timestamp: "9:43 AM",
			},
			{
				role: "user",
				content:
					"Next.js + Convex + OpenAI. The real-time sync was tricky but the community helped me solve it!",
				timestamp: "9:44 AM",
			},
			{
				role: "assistant",
				content:
					"That's what we're here for! Consider writing a blog post about it - we love production stories. 🚀",
				timestamp: "9:44 AM",
			},
		];

		let idx = 0;
		const id = setInterval(() => {
			setMessages((prev) => [...prev, convo[idx]]);
			idx += 1;
			if (idx === convo.length) {
				clearInterval(id);
			}
		}, 2000);
		return () => clearInterval(id);
	}, []);

	return (
    <motion.section 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="mx-auto w-full max-w-7xl overflow-hidden rounded-xl border bg-background shadow-2xl"
    >
      {/* Top bar with file tabs */}
      <div className="flex h-10 items-center gap-1 border-b bg-muted/30 px-4">
        <div className="flex gap-2">
          {files.map((f, idx) => (
            <button
              key={f}
              onClick={() => setActiveFile(idx)}
              className={cn(
                "cursor-pointer rounded-t-md px-3 py-1.5 text-sm transition-colors",
                activeFile === idx
                  ? "bg-background text-foreground border-t border-x"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-1">
          <div className="h-3 w-3 rounded-full bg-red-500" />
          <div className="h-3 w-3 rounded-full bg-yellow-500" />
          <div className="h-3 w-3 rounded-full bg-green-500" />
        </div>
      </div>

      {/* Main split view */}
      <div className="flex flex-col lg:flex-row">
        {/* Left code pane */}
        <div className="flex-1 border-r">
          <div className="p-6 lg:p-8">
            <div className="font-mono text-sm">
              {activeFile === 0 && (
                <div className="space-y-1">
                  {markdownContent.map((line, idx) => {
                    const lineNumber = (idx + 1).toString().padStart(2, ' ');
                    
                    if (line.startsWith("# ")) {
                      return (
                        <div key={idx} className="flex gap-4">
                          <span className="text-muted-foreground select-none">{lineNumber}</span>
                          <span className="text-2xl font-bold text-primary">
                            {line.substring(2)}
                          </span>
                        </div>
                      );
                    }
                    if (line.startsWith("## ")) {
                      return (
                        <div key={idx} className="flex gap-4 mt-4">
                          <span className="text-muted-foreground select-none">{lineNumber}</span>
                          <span className="text-lg font-semibold">
                            {line.substring(3)}
                          </span>
                        </div>
                      );
                    }
                    if (line === "```bash") {
                      return (
                        <div key={idx} className="flex gap-4">
                          <span className="text-muted-foreground select-none">{lineNumber}</span>
                          <span className="text-green-600 dark:text-green-400">```bash</span>
                        </div>
                      );
                    }
                    if (line === "```") {
                      return (
                        <div key={idx} className="flex gap-4">
                          <span className="text-muted-foreground select-none">{lineNumber}</span>
                          <span className="text-green-600 dark:text-green-400">```</span>
                        </div>
                      );
                    }
                    if (line.startsWith("$ ")) {
                      return (
                        <div key={idx} className="flex gap-4">
                          <span className="text-muted-foreground select-none">{lineNumber}</span>
                          <span className="text-blue-600 dark:text-blue-400">{line}</span>
                        </div>
                      );
                    }
                    if (line.startsWith("• ")) {
                      return (
                        <div key={idx} className="flex gap-4">
                          <span className="text-muted-foreground select-none">{lineNumber}</span>
                          <span className="text-muted-foreground">{line}</span>
                        </div>
                      );
                    }
                    return (
                      <div key={idx} className="flex gap-4">
                        <span className="text-muted-foreground select-none">{lineNumber}</span>
                        <span className={line === "" ? "h-4" : ""}>{line}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              {activeFile === 1 && (
                <div className="space-y-1">
                  <div className="flex gap-4">
                    <span className="text-muted-foreground select-none"> 1</span>
                    <span className="text-blue-600 dark:text-blue-400">import</span>
                    <span>{`{ Community }`}</span>
                    <span className="text-blue-600 dark:text-blue-400">from</span>
                    <span className="text-green-600 dark:text-green-400">'@vai/core'</span>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-muted-foreground select-none"> 2</span>
                    <span></span>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-muted-foreground select-none"> 3</span>
                    <span className="text-blue-600 dark:text-blue-400">export default function</span>
                    <span className="text-yellow-600 dark:text-yellow-400">JoinVAI</span>
                    <span>() {`{`}</span>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-muted-foreground select-none"> 4</span>
                    <span className="ml-4">return (</span>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-muted-foreground select-none"> 5</span>
                    <span className="ml-8">&lt;Community</span>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-muted-foreground select-none"> 6</span>
                    <span className="ml-12">members={`{500}`}</span>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-muted-foreground select-none"> 7</span>
                    <span className="ml-12">vibe=<span className="text-green-600 dark:text-green-400">"collaborative"</span></span>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-muted-foreground select-none"> 8</span>
                    <span className="ml-12">signal=<span className="text-green-600 dark:text-green-400">"high"</span></span>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-muted-foreground select-none"> 9</span>
                    <span className="ml-12">noise=<span className="text-green-600 dark:text-green-400">"zero"</span></span>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-muted-foreground select-none">10</span>
                    <span className="ml-8">/&gt;</span>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-muted-foreground select-none">11</span>
                    <span className="ml-4">)</span>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-muted-foreground select-none">12</span>
                    <span>{`}`}</span>
                  </div>
                </div>
              )}
              {activeFile === 2 && (
                <div className="space-y-1 text-xs">
                  <div className="flex gap-4">
                    <span className="text-muted-foreground select-none"> 1</span>
                    <span>{`{`}</span>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-muted-foreground select-none"> 2</span>
                    <span className="ml-4 text-blue-600 dark:text-blue-400">"latestInsights"</span>: [</span>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-muted-foreground select-none"> 3</span>
                    <span className="ml-8 text-green-600 dark:text-green-400">"GPT-4 fine-tuning strategies that actually work"</span>,</span>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-muted-foreground select-none"> 4</span>
                    <span className="ml-8 text-green-600 dark:text-green-400">"Production RAG patterns from Anthropic engineers"</span>,</span>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-muted-foreground select-none"> 5</span>
                    <span className="ml-8 text-green-600 dark:text-green-400">"How we reduced LLM costs by 73% (with code)"</span></span>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-muted-foreground select-none"> 6</span>
                    <span className="ml-4">],</span>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-muted-foreground select-none"> 7</span>
                    <span className="ml-4 text-blue-600 dark:text-blue-400">"weeklyChallenge"</span>: <span className="text-green-600 dark:text-green-400">"Build a local AI assistant"</span>,</span>
                  </div>
                  <div
	className =
		"flex gap-4" >
		<span className="text-muted-foreground select-none"> 8</span> <
		span;
	className = "ml-4 text-blue-600 dark:text-blue-400" > "activeSessions";
	</span>: <span className="text-yellow-600 dark:text-yellow-400">42</span></span>
	</div>
                  <div className="flex gap-4">
                    <span className="text-muted-foreground select-none"> 9</span>
                    <span>
	`}`;
	</span>
	</div>
                </div>
              )
}
</div>
          </div>

{
	/* Terminal */
}
<div className="border-t bg-muted/20">
	<div className="px-6 py-3 font-mono text-sm">
		<div className="flex items-center gap-2">
			<span className="text-green-500">➜</span>
			<span className="text-muted-foreground">vai-community</span>
			<span className="text-blue-500">git:(main)</span>
			<span>{typed}</span>
			<span className="animate-blink">▊</span>
		</div>
	</div>
</div>;
</div>

{
	/* Right chat pane */
}
<div className="hidden lg:flex w-full max-w-md flex-col border-t lg:border-t-0">
	{/* Chat header */}
	<div className="flex h-10 items-center gap-2 border-b bg-muted/30 px-4">
		<div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
		<span className="text-sm font-medium">Community Chat</span>
		<span className="text-xs text-muted-foreground ml-auto">42 online</span>
	</div>

	{/* Chat messages */}
	<div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/5">
		{messages.map((m, idx) => (
			<motion.div
				key={idx}
				initial={{ opacity: 0, x: -20 }}
				animate={{ opacity: 1, x: 0 }}
				transition={{ duration: 0.3 }}
				className={cn(
					"flex flex-col gap-1",
					m.role === "system" && "items-center",
				)}
			>
				{m.role === "system" ? (
					<div className="text-xs text-muted-foreground italic">
						{m.content}
					</div>
				) : (
					<>
						<div className="flex items-center gap-2">
							<span className="text-xs font-semibold">
								{m.role === "user" ? "alex_dev" : "parker_vai"}
							</span>
							<span className="text-xs text-muted-foreground">
								{m.timestamp}
							</span>
						</div>
						<div
							className={cn(
								"rounded-lg px-3 py-2 text-sm max-w-[90%]",
								m.role === "user"
									? "bg-primary text-primary-foreground self-start"
									: "bg-muted self-start",
							)}
						>
							{m.content}
						</div>
					</>
				)}
			</motion.div>
		))}
	</div>

	{/* Chat input */}
	<div className="border-t p-3">
		<div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2">
			<input
				type="text"
				placeholder="Type a message..."
				className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
				disabled
			/>
			<button className="text-muted-foreground hover:text-foreground">
				<svg
					className="h-4 w-4"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M14 5l7 7m0 0l-7 7m7-7H3"
					/>
				</svg>
			</button>
		</div>
	</div>
</div>;
</div>
    </motion.section>
  )
}
