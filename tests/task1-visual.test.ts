import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { fromGenerated, parseVisual, visualToText, visualGenerationSchema } from "../lib/task1-visual.ts"

const bar = {
  kind: "bar",
  title: "Renewable energy production",
  unit: "million tonnes",
  xLabels: ["2010", "2015", "2020"],
  series: [
    { name: "Germany", values: [35.2, 51.4, 68.4] },
    { name: "Brazil", values: [45, 52, 61.9] },
  ],
}

const failsWith = (raw: unknown, fragment: string) => {
  const { visual, error } = parseVisual(raw)
  assert.equal(visual, null)
  assert.match(error ?? "", new RegExp(fragment))
}

describe("parseVisual", () => {
  it("accepts a valid bar chart and stamps the version", () => {
    const { visual } = parseVisual(bar)
    assert.equal(visual?.version, 1)
    assert.equal(visual?.kind, "bar")
  })

  it("is idempotent, so stored visuals re-validate unchanged", () => {
    const once = parseVisual(bar).visual
    assert.deepEqual(parseVisual(once).visual, once)
  })

  it("rejects series that don't line up with the x axis", () => {
    failsWith({ ...bar, series: [{ name: "Germany", values: [1, 2] }] }, "series length")
    failsWith({ ...bar, series: [] }, "series")
  })

  it("requires pie charts to total about 100%", () => {
    const pie = (values: number[]) => ({
      kind: "pie",
      title: "Water use",
      pies: [{ label: "2020", slices: values.map((value, i) => ({ label: `Use ${i}`, value })) }],
    })
    assert.ok(parseVisual(pie([45, 20, 25, 10])).visual)
    failsWith(pie([40, 20, 25, 5]), "pie total")
  })

  it("rejects maps whose two periods are identical", () => {
    const period = (label: string) => ({ label, cells: ["Farm", "", "Forest", "", "Houses", "Beach", "", "Port", ""] })
    failsWith({ kind: "map", title: "Seabury", before: period("2000"), after: period("2020") }, "identical")
  })

  it("rejects non-numeric values and unknown kinds", () => {
    failsWith({ ...bar, series: [{ name: "Germany", values: [1, "two", 3] }] }, "non-numeric")
    failsWith({ kind: "radar", title: "x" }, "unknown chart kind")
  })
})

describe("fromGenerated", () => {
  it("places map features by compass position", () => {
    const generated = visualGenerationSchema.parse({
      kind: "map",
      title: "Riverside Park",
      map: {
        before: { label: "1995", features: [{ place: "Forest", position: "NW" }, { place: "River", position: "S" }, { place: "Farm", position: "N" }, { place: "Houses", position: "E" }] },
        after: { label: "2020", features: [{ place: "Hotel", position: "NW" }, { place: "River", position: "S" }, { place: "Museum", position: "N" }, { place: "Houses", position: "E" }] },
      },
    })
    const { visual } = parseVisual(fromGenerated(generated))
    assert.equal(visual?.kind, "map")
    if (visual?.kind !== "map") return
    assert.equal(visual.before.cells[0], "Forest")
    assert.equal(visual.before.cells[7], "River")
    assert.equal(visual.after.cells[1], "Museum")
    assert.equal(visual.after.cells.length, 9)
  })

  it("lets a missing data block fail validation instead of passing through", () => {
    const generated = visualGenerationSchema.parse({ kind: "line", title: "Empty" })
    assert.equal(parseVisual(fromGenerated(generated)).visual, null)
  })
})

describe("visualToText", () => {
  it("includes every figure so the grader can check the essay", () => {
    const text = visualToText(parseVisual(bar).visual!)
    assert.match(text, /Germany: 2010=35\.2, 2015=51\.4, 2020=68\.4/)
    assert.match(text, /unit: million tonnes/)
  })
})
