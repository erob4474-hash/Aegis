"use client"

import { useCallback, useEffect, useState } from "react"

const AGENT_BASE_URL = "http://127.0.0.1:3000"

export type AgentStatus = "connected" | "disconnected" | "checking"

export function useAgentStatus(pollIntervalMs = 10000) {
  const [status, setStatus] = useState<AgentStatus>("checking")

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch(`${AGENT_BASE_URL}/api/policy`, {
        method: "GET",
        signal: AbortSignal.timeout(3000),
      })
      if (res.ok || res.status === 200) {
        setStatus("connected")
      } else {
        setStatus("disconnected")
      }
    } catch {
      setStatus("disconnected")
    }
  }, [])

  useEffect(() => {
    checkStatus()
    const id = setInterval(checkStatus, pollIntervalMs)
    return () => clearInterval(id)
  }, [checkStatus, pollIntervalMs])

  return { status, checkStatus }
}
