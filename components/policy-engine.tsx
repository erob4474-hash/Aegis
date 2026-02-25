"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Shield,
  Mail,
  CreditCard,
  KeyRound,
  FileText,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Fingerprint,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAgentStatus } from "@/hooks/use-agent-status"
import { AgentStatusBadge } from "@/components/agent-status-badge"

const AGENT_BASE_URL = "http://127.0.0.1:3000"

// ==========================================
// DLP filter definitions
// ==========================================

interface DlpFilter {
  id: string
  label: string
  description: string
  policyLine: string
  icon: React.ReactNode
}

const DLP_FILTERS: DlpFilter[] = [
  {
    id: "ssn",
    label: "Social Security / NAS",
    description: "Redact SSN and NAS numbers (XXX-XX-XXXX, XXX-XXX-XXX)",
    policyLine: "REDACT all Social Security numbers",
    icon: <Fingerprint className="h-4 w-4" />,
  },
  {
    id: "email",
    label: "Email Addresses",
    description: "Redact all email addresses from prompts",
    policyLine: "REDACT email addresses",
    icon: <Mail className="h-4 w-4" />,
  },
  {
    id: "cc",
    label: "Credit Card Numbers",
    description: "Redact credit and debit card numbers (13-16 digits)",
    policyLine: "REDACT credit card numbers",
    icon: <CreditCard className="h-4 w-4" />,
  },
  {
    id: "api",
    label: "API Keys / Tokens",
    description: "Redact long alphanumeric tokens and API keys",
    policyLine: "REDACT API keys and tokens",
    icon: <KeyRound className="h-4 w-4" />,
  },
]

// ==========================================
// Notification types
// ==========================================

type NotificationType = "success" | "error" | "info"

interface Notification {
  type: NotificationType
  message: string
}

// ==========================================
// Switch component (inline)
// ==========================================

function PolicySwitch({
  checked,
  onCheckedChange,
  disabled,
}: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        checked ? "bg-primary" : "bg-secondary",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      <span
        className={cn(
          "pointer-events-none block h-5 w-5 rounded-full bg-foreground shadow-lg ring-0 transition-transform",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  )
}

// ==========================================
// Main PolicyEngine component
// ==========================================

export function PolicyEngine() {
  const { status, checkStatus } = useAgentStatus()
  const [policyText, setPolicyText] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [notification, setNotification] = useState<Notification | null>(null)

  // Dismiss notification after timeout
  useEffect(() => {
    if (!notification) return
    const t = setTimeout(() => setNotification(null), 4000)
    return () => clearTimeout(t)
  }, [notification])

  // ------------------------------------------
  // 1. INITIALIZATION: GET current policy
  // ------------------------------------------

  const fetchPolicy = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`${AGENT_BASE_URL}/api/policy`, {
        method: "GET",
        signal: AbortSignal.timeout(3000),
      })
      if (res.ok) {
        const text = await res.text()
        setPolicyText(text)
      } else {
        setNotification({
          type: "error",
          message: "Failed to fetch policy from agent.",
        })
      }
    } catch {
      setNotification({
        type: "error",
        message: "L'Agent Aegis local est deconnecte. Impossible de charger la politique.",
      })
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPolicy()
  }, [fetchPolicy])

  // ------------------------------------------
  // 2. DEPLOY: POST updated policy
  // ------------------------------------------

  const handleSavePolicy = async () => {
    setIsSaving(true)
    try {
      const res = await fetch(`${AGENT_BASE_URL}/api/policy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policy_text: policyText }),
        signal: AbortSignal.timeout(5000),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          setNotification({
            type: "success",
            message: "Policy deployed to Aegis Agent successfully.",
          })
        } else {
          setNotification({
            type: "error",
            message: "Agent returned an error while saving the policy.",
          })
        }
      } else {
        setNotification({
          type: "error",
          message: `Agent returned HTTP ${res.status}. Policy was not saved.`,
        })
      }
    } catch {
      setNotification({
        type: "error",
        message: "L'Agent Aegis local est deconnecte. Impossible de deployer la politique.",
      })
    } finally {
      setIsSaving(false)
      checkStatus()
    }
  }

  // ------------------------------------------
  // 3. SYNC: Derive switch states from policy text
  // ------------------------------------------

  const filterStates = useMemo(() => {
    const states: Record<string, boolean> = {}
    for (const filter of DLP_FILTERS) {
      states[filter.id] = policyText.includes(filter.policyLine)
    }
    return states
  }, [policyText])

  const handleToggleFilter = (filter: DlpFilter, enabled: boolean) => {
    if (enabled) {
      // Add the line if not present
      if (!policyText.includes(filter.policyLine)) {
        const newText = policyText.trim()
          ? `${policyText.trim()}\n${filter.policyLine}`
          : filter.policyLine
        setPolicyText(newText)
      }
    } else {
      // Remove the line
      const lines = policyText.split("\n").filter((line) => line.trim() !== filter.policyLine)
      setPolicyText(lines.join("\n"))
    }
  }

  // ------------------------------------------
  // Render
  // ------------------------------------------

  const isDisconnected = status === "disconnected"

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-foreground">Aegis Shield</h1>
              <p className="text-xs text-muted-foreground">Policy Engine v2.4</p>
            </div>
          </div>
          <AgentStatusBadge status={status} />
        </div>
      </header>

      {/* Notification banner */}
      {notification && (
        <div
          className={cn(
            "border-b px-6 py-3 text-sm font-medium flex items-center gap-2",
            notification.type === "success" && "bg-primary/10 text-primary border-primary/20",
            notification.type === "error" && "bg-destructive/10 text-destructive border-destructive/20",
            notification.type === "info" && "bg-accent text-foreground border-border"
          )}
        >
          <div className="mx-auto flex max-w-5xl items-center gap-2">
            {notification.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : notification.type === "error" ? (
              <AlertTriangle className="h-4 w-4 shrink-0" />
            ) : null}
            {notification.message}
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        <div className="grid gap-8 lg:grid-cols-5">
          {/* Left column: DLP Filters */}
          <section className="lg:col-span-2">
            <div className="mb-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                DLP Filters
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Toggle filters to auto-update the policy text. The raw text is the source of truth.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {DLP_FILTERS.map((filter) => (
                <div
                  key={filter.id}
                  className={cn(
                    "group flex items-center justify-between rounded-lg border p-4 transition-colors",
                    filterStates[filter.id]
                      ? "border-primary/30 bg-primary/5"
                      : "border-border bg-card"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-md",
                        filterStates[filter.id]
                          ? "bg-primary/15 text-primary"
                          : "bg-secondary text-muted-foreground"
                      )}
                    >
                      {filter.icon}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{filter.label}</p>
                      <p className="text-xs text-muted-foreground">{filter.description}</p>
                    </div>
                  </div>
                  <PolicySwitch
                    checked={filterStates[filter.id]}
                    onCheckedChange={(checked) => handleToggleFilter(filter, checked)}
                    disabled={isLoading}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Right column: Raw Policy Editor */}
          <section className="lg:col-span-3">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Raw Policy
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Edit rules directly. Each line is a redaction directive for the Rust agent.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchPolicy}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
                  aria-label="Refresh policy from agent"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
                  Refresh
                </button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute left-3 top-3 text-muted-foreground">
                <FileText className="h-4 w-4" />
              </div>
              <textarea
                value={policyText}
                onChange={(e) => setPolicyText(e.target.value)}
                disabled={isLoading}
                placeholder={
                  isLoading
                    ? "Loading policy from Aegis Agent..."
                    : "# Enter redaction rules, one per line\nREDACT all Social Security numbers\nREDACT email addresses\nREDACT credit card numbers\nREDACT API keys and tokens"
                }
                className={cn(
                  "min-h-[320px] w-full resize-y rounded-lg border bg-card p-4 pl-10 font-mono text-sm text-foreground",
                  "placeholder:text-muted-foreground/50",
                  "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
                  "transition-colors",
                  isLoading && "animate-pulse opacity-50"
                )}
                spellCheck={false}
              />
            </div>

            {/* Disconnection warning */}
            {isDisconnected && (
              <div className="mt-3 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-xs text-destructive">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  L{"'"}Agent Aegis local est deconnecte. Lancez{" "}
                  <code className="rounded bg-destructive/10 px-1 py-0.5 font-mono">
                    cargo run
                  </code>{" "}
                  dans le dossier <code className="rounded bg-destructive/10 px-1 py-0.5 font-mono">aegis_agent</code> pour le demarrer.
                </span>
              </div>
            )}

            {/* Deploy button */}
            <div className="mt-4 flex items-center justify-end gap-3">
              <span className="text-xs text-muted-foreground">
                {policyText.split("\n").filter((l) => l.trim()).length} active rule(s)
              </span>
              <button
                onClick={handleSavePolicy}
                disabled={isSaving || isLoading}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all",
                  "bg-primary text-primary-foreground",
                  "hover:bg-primary/90",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {isSaving ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {isSaving ? "Deploying..." : "Deploy Policy"}
              </button>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <p className="text-xs text-muted-foreground">
            Aegis Shield DLP System
          </p>
          <p className="text-xs text-muted-foreground font-mono">
            Agent @ 127.0.0.1:3000
          </p>
        </div>
      </footer>
    </div>
  )
}
