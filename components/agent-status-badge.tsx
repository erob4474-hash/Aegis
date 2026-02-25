"use client"

import { cn } from "@/lib/utils"
import type { AgentStatus } from "@/hooks/use-agent-status"

const statusConfig: Record<AgentStatus, { label: string; dotClass: string; textClass: string }> = {
  connected: {
    label: "Agent Connected",
    dotClass: "bg-primary",
    textClass: "text-primary",
  },
  disconnected: {
    label: "Agent Disconnected",
    dotClass: "bg-destructive",
    textClass: "text-destructive",
  },
  checking: {
    label: "Checking...",
    dotClass: "bg-muted-foreground",
    textClass: "text-muted-foreground",
  },
}

export function AgentStatusBadge({ status }: { status: AgentStatus }) {
  const config = statusConfig[status]

  return (
    <div className="flex items-center gap-2 rounded-md border px-3 py-1.5">
      <span className={cn("relative flex h-2.5 w-2.5")}>
        {status === "connected" && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
        )}
        <span className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", config.dotClass)} />
      </span>
      <span className={cn("text-xs font-medium font-mono", config.textClass)}>
        {config.label}
      </span>
    </div>
  )
}
