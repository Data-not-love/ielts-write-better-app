import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { validateTextFields } from "../lib/input-limits.ts"
import { tagsIncludeTopic, toIeltsTopic } from "../lib/ielts-topics.ts"
import { categoriesForTask, taskOfCategory, toIeltsCategory } from "../lib/ielts-categories.ts"

describe("validateTextFields", () => {
  it("skips absent fields and accepts strings within the limit", () => {
    assert.equal(validateTextFields({ essay: ["ok", 10], prompt: [undefined, 10], title: [null, 10] }), null)
  })

  it("rejects non-strings with 400 and oversized text with 413", () => {
    assert.equal(validateTextFields({ text: [{ a: 1 }, 10] })?.status, 400)
    assert.equal(validateTextFields({ text: ["x".repeat(11), 10] })?.status, 413)
  })
})

describe("IELTS topics", () => {
  it("canonicalizes casing and rejects unknown topics", () => {
    assert.equal(toIeltsTopic("  crime and punishment "), "Crime and Punishment")
    assert.equal(toIeltsTopic("War"), undefined)
    assert.equal(toIeltsTopic(42), undefined)
  })

  it("matches tags case-insensitively", () => {
    assert.ok(tagsIncludeTopic(["law", "Policy"], "Law"))
    assert.ok(!tagsIncludeTopic(["Lawyers"], "Law"))
  })
})

describe("IELTS categories", () => {
  it("splits categories by task", () => {
    assert.ok(categoriesForTask("Task 1").includes("Map"))
    assert.ok(!categoriesForTask("Task 1").includes("Opinion"))
    assert.equal(categoriesForTask("all").length, categoriesForTask("Task 1").length + categoriesForTask("Task 2").length)
  })

  it("canonicalizes names and knows each category's task", () => {
    assert.equal(toIeltsCategory("two-part question"), "Two-part Question")
    assert.equal(taskOfCategory("Process"), "Task 1")
    assert.equal(taskOfCategory("Opinion"), "Task 2")
  })
})
