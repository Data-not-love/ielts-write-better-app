"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { Loader2, AlertTriangle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function ProfileSettings() {
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const [formData, setFormData] = useState({
    name: "Alex Chen",
    email: "alex@example.com",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    targetBand: "7.5",
    focusTR: true,
    focusCC: false,
    focusLR: true,
    focusGRA: false,
    tone: "neutral",
    level: "B2",
    language: "en",
  })

  const [hasChanges, setHasChanges] = useState(false)

  const handleChange = <K extends keyof typeof formData>(field: K, value: (typeof formData)[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }

  const handleSave = () => {
    setIsSaving(true)
    setTimeout(() => {
      setIsSaving(false)
      setHasChanges(false)
      toast({
        title: "Profile updated",
        description: "Your settings have been saved successfully.",
      })
    }, 1000)
  }

  const handleDeleteAccount = () => {
    setIsDeleting(true)
    setTimeout(() => {
      setIsDeleting(false)
      setShowDeleteDialog(false)
      toast({
        title: "Account deleted",
        description: "Your account has been permanently deleted.",
        variant: "destructive",
      })
      // Redirect to home
      window.location.href = "/"
    }, 2000)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Profile Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      <div className="space-y-6 max-w-3xl">
        {/* Account */}
        <Card className="rounded-2xl border-border bg-card">
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Update your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Your name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={formData.email} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>

            <div className="pt-4 border-t border-border">
              <h4 className="text-sm font-medium mb-4">Change Password</h4>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={formData.currentPassword}
                    onChange={(e) => handleChange("currentPassword", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={formData.newPassword}
                    onChange={(e) => handleChange("newPassword", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange("confirmPassword", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Learning Goals */}
        <Card className="rounded-2xl border-border bg-card">
          <CardHeader>
            <CardTitle>Learning Goals</CardTitle>
            <CardDescription>Set your target band score and focus areas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="target-band">Target Band Score</Label>
              <Select value={formData.targetBand} onValueChange={(value) => handleChange("targetBand", value)}>
                <SelectTrigger id="target-band">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6.0">6.0</SelectItem>
                  <SelectItem value="6.5">6.5</SelectItem>
                  <SelectItem value="7.0">7.0</SelectItem>
                  <SelectItem value="7.5">7.5</SelectItem>
                  <SelectItem value="8.0">8.0</SelectItem>
                  <SelectItem value="8.5">8.5</SelectItem>
                  <SelectItem value="9.0">9.0</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3 pt-4 border-t border-border">
              <Label>Focus Areas</Label>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Task Response (TR)</p>
                    <p className="text-xs text-muted-foreground">Addressing the question fully</p>
                  </div>
                  <Switch checked={formData.focusTR} onCheckedChange={(checked) => handleChange("focusTR", checked)} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Coherence & Cohesion (CC)</p>
                    <p className="text-xs text-muted-foreground">Logical flow and linking</p>
                  </div>
                  <Switch checked={formData.focusCC} onCheckedChange={(checked) => handleChange("focusCC", checked)} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Lexical Resource (LR)</p>
                    <p className="text-xs text-muted-foreground">Vocabulary range and accuracy</p>
                  </div>
                  <Switch checked={formData.focusLR} onCheckedChange={(checked) => handleChange("focusLR", checked)} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Grammar & Accuracy (GRA)</p>
                    <p className="text-xs text-muted-foreground">Sentence structures and grammar</p>
                  </div>
                  <Switch
                    checked={formData.focusGRA}
                    onCheckedChange={(checked) => handleChange("focusGRA", checked)}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card className="rounded-2xl border-border bg-card">
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>Customize your experience</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tone">AI Feedback Tone</Label>
              <Select value={formData.tone} onValueChange={(value) => handleChange("tone", value)}>
                <SelectTrigger id="tone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="neutral">Neutral</SelectItem>
                  <SelectItem value="academic">Academic</SelectItem>
                  <SelectItem value="concise">Concise</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="level">English Level</Label>
              <Select value={formData.level} onValueChange={(value) => handleChange("level", value)}>
                <SelectTrigger id="level">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="B1">B1 (Intermediate)</SelectItem>
                  <SelectItem value="B2">B2 (Upper-Intermediate)</SelectItem>
                  <SelectItem value="C1">C1 (Advanced)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Interface Language</Label>
              <Select value={formData.language} onValueChange={(value) => handleChange("language", value)}>
                <SelectTrigger id="language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="de">Deutsch</SelectItem>
                  <SelectItem value="zh">中文</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={!hasChanges || isSaving} size="lg">
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>

        {/* Danger Zone */}
        <Card className="rounded-2xl border-destructive bg-card">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>Irreversible actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium mb-1">Delete Account</p>
                <p className="text-xs text-muted-foreground">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
              </div>
              <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                Delete Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="rounded-full bg-destructive/10 p-2">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <DialogTitle>Delete Account?</DialogTitle>
            </div>
            <DialogDescription>
              This action cannot be undone. All your tasks, progress reports, and account data will be permanently
              deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteAccount} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Account"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
