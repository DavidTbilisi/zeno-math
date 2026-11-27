// Build a system (#853): devices fit only ports of their kind, the card's display port comes and goes with the card,
// and each mission runs when its devices are in and stops at the first missing or misplaced link.
import assert from "node:assert/strict";
import { test } from "node:test";
import { SYSTEM_LADDER, fitOf, freeSlot, plugIn, runSystem, spareOf, unplug, type Dev, type Plugged } from "../src/math/systemLab";

/** Each device into the first slot it fits, as the keyboard does it. */
const build = (devs: Dev[], from: Plugged = {}) => devs.reduce((p, d) => plugIn(p, d, freeSlot(d, p)!), from);

test("a device fits only a free port of its own kind", () => {
  assert.equal(fitOf("keyboard", "usb0", {}), null);
  assert.equal(fitOf("keyboard", "video", {}), "kind");
  assert.equal(fitOf("mouse", "usb0", { usb0: "keyboard" }), "taken");
  assert.equal(fitOf("display", "gpuVideo", {}), "gone");
  assert.equal(fitOf("display", "gpuVideo", { pcie: "gpu" }), null);
  assert.equal(freeSlot("mouse", { usb0: "keyboard" }), "usb1");
});

test("moving a plug takes it out of its old port; the card out takes its display with it", () => {
  const p = plugIn({ video: "display", pcie: "gpu" }, "display", "gpuVideo");
  assert.deepEqual(p, { pcie: "gpu", gpuVideo: "display" });
  assert.deepEqual(unplug(p, "gpu"), {});
});

test("every mission runs with its devices in, and not one link short", () => {
  const solutions: Dev[][] = [
    ["cpu", "ram", "ssd", "display"],
    ["keyboard", "cpu", "ram", "ssd", "display"],
    ["mouse", "cpu", "ram", "hdd", "display", "speakers"],
    ["link", "ssd"],
    [],
    ["camera", "mic", "cpu", "ram", "hdd", "link"],
    ["sensor", "cpu", "ram", "ssd", "display", "link"],
    ["keyboard", "cpu", "ram", "ssd", "display", "link"],
  ];
  SYSTEM_LADDER.forEach((m, k) => {
    let p = build(solutions[k], m.start);
    if (m.key === "console") {
      // The hard disk out for the fast one, the card in, the display moved onto the card, the game pad and speakers.
      p = build(["ssd", "gpu", "gamepad", "speakers"], unplug(p, "hdd"));
      assert.equal(runSystem(p, m).links.find((l) => l.dev === "display")?.why, "wrongPort");
      p = plugIn(p, "display", "gpuVideo");
    }
    assert.equal(runSystem(p, m).fail, null, m.key);
    // Each needed device out, one at a time: the run stops there.
    for (const need of m.needs) {
      const dev = need.any.find((d) => Object.values(p).includes(d))!;
      const r = runSystem(unplug(p, dev), m);
      assert.notEqual(r.fail, null, `${m.key} without ${dev}`);
      assert.ok(r.links.slice(r.fail! + 1).every((l) => !l.ok), "nothing lights after the break");
    }
  });
  assert.deepEqual(spareOf(build(["cpu", "ram", "ssd", "display", "mouse"]), SYSTEM_LADDER[0]), ["mouse"]);
});

test("free play runs whatever is in, and needs the CPU and memory", () => {
  assert.equal(runSystem(build(["keyboard", "display"]), null).fail, 1);
  assert.equal(runSystem(build(["keyboard", "cpu", "ram", "display"]), null).fail, null);
});
