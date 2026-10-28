"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { authFetch } from "@/lib/auth-fetch"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Target, Save, Loader2 } from "lucide-react"
import type { UserTarget } from "@/types/reports"

interface TargetSettingProps {
  userId: string
  onTargetSaved?: (target: UserTarget) => void
  currentTarget?: UserTarget | null
}

export function TargetSetting({ userId, onTargetSaved, currentTarget }: TargetSettingProps) {
  const [targetBand, setTargetBand] = useState<number>(currentTarget?.targetOverallBand || 7.0)
  const [deadline, setDeadline] = useState<string>(currentTarget?.deadline || "")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    if (currentTarget) {
      setTargetBand(currentTarget.targetOverallBand)
      setDeadline(currentTarget.deadline || "")
    }
  }, [currentTarget])

  const bandOptions = []
  for (let i = 5.0; i <= 9.0; i += 0.5) {
    bandOptions.push(i)
  }

  async function handleSave() {
    setSaving(true)
    setMessage(null)

    try {
      const response = await authFetch("/api/reports/target", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          targetOverallBand: targetBand,
          deadline: deadline || undefined,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save target")
      }

      const data = await response.json()
      setMessage({ type: "success", text: "Target saved successfully!" })
      
      if (onTargetSaved && data.target) {
        onTargetSaved(data.target)
      }
    } catch (err) {
      console.error("Error saving target:", err)
      setMessage({ 
        type: "error", 
        text: err instanceof Error ? err.message : "Failed to save target" 
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="rounded-2xl border-border bg-card">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <CardTitle className="text-xl">Set Your Target</CardTitle>
        </div>
        <CardDescription>Define your goal to get personalized recommendations</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="target-band">Target Overall Band</Label>
          <select
            id="target-band"
            value={targetBand}
            onChange={(e) => setTargetBand(parseFloat(e.target.value))}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {bandOptions.map((band) => (
              <option key={band} value={band}>
                Band {band.toFixed(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="deadline">Deadline (Optional)</Label>
          <Input
            id="deadline"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
          />
        </div>

        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="w-full"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Target
            </>
          )}
        </Button>

        {message && (
          <div
            className={`text-sm p-3 rounded-md ${
              message.type === "success"
                ? "bg-success/10 text-success border border-success/20"
                : "bg-destructive/10 text-destructive border border-destructive/20"
            }`}
          >
            {message.text}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
