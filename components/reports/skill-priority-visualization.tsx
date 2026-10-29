"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, AlertTriangle, CheckCircle } from "lucide-react"
import type { SkillPriority } from "@/types/reports"

const CRITERIA_NAMES = {
  TR: "Task Response",
  CC: "Coherence & Cohesion",
  LR: "Lexical Resource",
  GRA: "Grammar & Accuracy"
}

interface SkillPriorityVisualizationProps {
  skillPriority: SkillPriority
  currentAverage: number
  targetBand: number
}

export function SkillPriorityVisualization({ 
  skillPriority, 
  currentAverage,
  targetBand 
}: SkillPriorityVisualizationProps) {
  const skills = ["TR", "CC", "LR", "GRA"] as const

  const getPriorityColor = (priority: "high" | "medium" | "low") => {
    switch (priority) {
      case "high":
        return "bg-destructive"
      case "medium":
        return "bg-warning"
      case "low":
        return "bg-success"
    }
  }

  const getPriorityIcon = (priority: "high" | "medium" | "low") => {
    switch (priority) {
      case "high":
        return <AlertTriangle className="h-4 w-4 text-destructive" />
      case "medium":
        return <TrendingUp className="h-4 w-4 text-warning" />
      case "low":
        return <CheckCircle className="h-4 w-4 text-success" />
    }
  }

  const getPriorityBadgeVariant = (priority: "high" | "medium" | "low") => {
    switch (priority) {
      case "high":
        return "destructive"
      case "medium":
        return "default"
      case "low":
        return "outline"
    }
  }

  return (
    <Card className="rounded-2xl border-border bg-card">
      <CardHeader>
        <CardTitle className="text-xl">Skill Priority</CardTitle>
        <CardDescription>
          Focus areas to reach your target of {targetBand.toFixed(1)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Current Average</p>
            <p className="text-2xl font-bold">{currentAverage.toFixed(1)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-muted-foreground">Gap to Target</p>
            <p className="text-2xl font-bold text-primary">
              {(targetBand - currentAverage).toFixed(1)}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {skills.map((skill) => {
            const skillData = skillPriority[skill]
            const progress = (skillData.current / targetBand) * 100

            return (
              <div key={skill} className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {getPriorityIcon(skillData.priority)}
                    <span className="text-sm font-medium">
                      {CRITERIA_NAMES[skill]}
                    </span>
                    <Badge 
                      variant={getPriorityBadgeVariant(skillData.priority)}
                      className="text-xs"
                    >
                      {skillData.priority}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">
                      {skillData.current.toFixed(1)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      → {skillData.target.toFixed(1)}
                    </span>
                    <span className="text-sm font-medium text-primary">
                      ({skillData.gap > 0 ? '+' : ''}{skillData.gap.toFixed(1)})
                    </span>
                  </div>
                </div>
                <div className="relative">
                  <Progress 
                    value={progress} 
                    className="h-2"
                  />
                  <div 
                    className={`absolute top-0 left-0 h-2 rounded-full transition-all ${getPriorityColor(skillData.priority)}`}
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
          <p className="text-sm font-medium mb-2">Primary Focus</p>
          <p className="text-sm text-muted-foreground">
            Concentrate on improving <strong>{CRITERIA_NAMES[skillPriority.primaryWeakSkill]}</strong> and{" "}
            <strong>{CRITERIA_NAMES[skillPriority.secondaryWeakSkill]}</strong> to reach your target faster.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
