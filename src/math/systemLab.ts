// Build a system (#853): a motherboard with sockets, slots and ports, devices that each fit only a port of their own
// kind, and missions that are small systems, each needing its own devices. Running one sends a signal along its path,
// the inputs, then the CPU and memory over the bus, then storage and the outputs, and it stops at the first link
// missing or plugged in the wrong place (Stallings ch. 3 and 7.1; Tanenbaum 2.4 and 3.4).
import type { GameBase } from "./ladder";

export type Kind = "cpu" | "ram" | "pcie" | "sata" | "usb" | "video" | "audioOut" | "audioIn" | "net";
export type Dev =
  | "cpu" | "ram" | "ssd" | "hdd" | "gpu"
  | "keyboard" | "mouse" | "gamepad" | "camera" | "mic" | "sensor"
  | "display" | "speakers" | "link";
export type SlotId = "cpu" | "ram0" | "ram1" | "pcie" | "sata0" | "sata1" | "usb0" | "usb1" | "usb2" | "usb3" | "video" | "gpuVideo" | "audioOut" | "audioIn" | "net";

export const SLOTS: readonly { id: SlotId; kind: Kind }[] = [
  { id: "cpu", kind: "cpu" },
  { id: "ram0", kind: "ram" },
  { id: "ram1", kind: "ram" },
  { id: "pcie", kind: "pcie" },
  { id: "sata0", kind: "sata" },
  { id: "sata1", kind: "sata" },
  { id: "usb0", kind: "usb" },
  { id: "usb1", kind: "usb" },
  { id: "usb2", kind: "usb" },
  { id: "usb3", kind: "usb" },
  { id: "video", kind: "video" },
  { id: "gpuVideo", kind: "video" },
  { id: "audioOut", kind: "audioOut" },
  { id: "audioIn", kind: "audioIn" },
  { id: "net", kind: "net" },
];
export const kindOfSlot = (id: SlotId) => SLOTS.find((s) => s.id === id)!.kind;

/** Each device's plug, and its part in a system's path. */
export const DEVICES: Record<Dev, { kind: Kind; role: "input" | "core" | "storage" | "output" | "link" }> = {
  cpu: { kind: "cpu", role: "core" },
  ram: { kind: "ram", role: "core" },
  ssd: { kind: "sata", role: "storage" },
  hdd: { kind: "sata", role: "storage" },
  gpu: { kind: "pcie", role: "output" },
  keyboard: { kind: "usb", role: "input" },
  mouse: { kind: "usb", role: "input" },
  gamepad: { kind: "usb", role: "input" },
  camera: { kind: "usb", role: "input" },
  sensor: { kind: "usb", role: "input" },
  mic: { kind: "audioIn", role: "input" },
  display: { kind: "video", role: "output" },
  speakers: { kind: "audioOut", role: "output" },
  link: { kind: "net", role: "link" },
};
export const DEV_ORDER = Object.keys(DEVICES) as Dev[];

export type Plugged = Partial<Record<SlotId, Dev>>;

/** The graphics card's own display port is there only while the card is in its slot. */
export const slotThere = (id: SlotId, p: Plugged) => id !== "gpuVideo" || p.pcie === "gpu";
export const slotOf = (dev: Dev, p: Plugged) => (Object.keys(p) as SlotId[]).find((k) => p[k] === dev) ?? null;

/** Why a device won't go into a slot, or null if it fits. */
export function fitOf(dev: Dev, slot: SlotId, p: Plugged): "kind" | "taken" | "gone" | null {
  if (!slotThere(slot, p)) return "gone";
  if (DEVICES[dev].kind !== kindOfSlot(slot)) return "kind";
  if (p[slot] && p[slot] !== dev) return "taken";
  return null;
}

/** A device into a slot (out of the one it was in); the card out takes its display port with it. */
export function plugIn(p: Plugged, dev: Dev, slot: SlotId): Plugged {
  const out = unplug(p, dev);
  return { ...out, [slot]: dev };
}
export function unplug(p: Plugged, dev: Dev): Plugged {
  const out: Plugged = {};
  for (const k of Object.keys(p) as SlotId[]) if (p[k] !== dev) out[k] = p[k];
  if (dev === "gpu") delete out.gpuVideo;
  return out;
}
/** The first free slot a device fits, for the keyboard and for a tap on the tray. */
export const freeSlot = (dev: Dev, p: Plugged) => SLOTS.find((s) => fitOf(dev, s.id, p) === null && !p[s.id])?.id ?? null;

/** One link of a system: any of these devices, and if it matters, only in these slots. */
export type Need = { any: readonly Dev[]; via?: readonly SlotId[] };
export type Mission = { key: string; needs: readonly Need[]; start?: Plugged };

const CORE: Need[] = [{ any: ["cpu"] }, { any: ["ram"] }];
const DISK: Need = { any: ["ssd", "hdd"] };
export const SYSTEM_LADDER: readonly Mission[] = [
  { key: "boot", needs: [...CORE, DISK, { any: ["display"] }] },
  { key: "calculator", needs: [{ any: ["keyboard"] }, ...CORE, DISK, { any: ["display"] }] },
  { key: "music", needs: [{ any: ["mouse"] }, ...CORE, DISK, { any: ["display"] }, { any: ["speakers"] }] },
  { key: "server", needs: [{ any: ["link"] }, ...CORE, DISK], start: { cpu: "cpu", ram0: "ram", usb0: "keyboard", video: "display" } },
  {
    key: "console",
    needs: [{ any: ["gamepad"] }, ...CORE, { any: ["ssd"] }, { any: ["gpu"] }, { any: ["display"], via: ["gpuVideo"] }, { any: ["speakers"] }],
    start: { cpu: "cpu", ram0: "ram", sata0: "hdd", video: "display", usb0: "keyboard" },
  },
  { key: "camera", needs: [{ any: ["camera"] }, { any: ["mic"] }, ...CORE, { any: ["hdd"] }, { any: ["link"] }] },
  { key: "weather", needs: [{ any: ["sensor"] }, ...CORE, DISK, { any: ["display"] }, { any: ["link"] }] },
  { key: "network", needs: [{ any: ["keyboard"] }, ...CORE, DISK, { any: ["display"] }, { any: ["link"] }] },
];

/** A link of the run: what it needs, the device and slot found for it, and whether the signal got through. */
export type RunLink = { need: Need; dev: Dev | null; slot: SlotId | null; ok: boolean; why: "missing" | "wrongPort" | null };
export type Run = { links: RunLink[]; fail: number | null };

/** The signal along a mission's path: each need in turn, stopping at the first one not met. */
export function runSystem(p: Plugged, m: Mission | null): Run {
  const needs = m ? m.needs : freeNeeds(p);
  const links: RunLink[] = [];
  let fail: number | null = null;
  for (const need of needs) {
    const there = need.any.map((d) => ({ dev: d, slot: slotOf(d, p) })).filter((x) => x.slot !== null);
    const good = there.find((x) => !need.via || need.via.includes(x.slot!));
    const link: RunLink = good
      ? { need, dev: good.dev, slot: good.slot, ok: fail === null, why: null }
      : { need, dev: there[0]?.dev ?? null, slot: there[0]?.slot ?? null, ok: false, why: there.length ? "wrongPort" : "missing" };
    if (!good && fail === null) fail = links.length;
    links.push(link);
  }
  return { links, fail };
}

/** Free play's path: whatever inputs are in, the CPU and memory, any storage, whatever outputs are in. */
function freeNeeds(p: Plugged): Need[] {
  const inRole = (r: string) => DEV_ORDER.filter((d) => DEVICES[d].role === r && slotOf(d, p)).map((d) => ({ any: [d] }));
  return [...inRole("input"), ...inRole("link"), ...CORE, ...inRole("storage"), ...inRole("output")];
}

/** Devices plugged in that the mission doesn't use. */
export const spareOf = (p: Plugged, m: Mission) => (Object.values(p) as Dev[]).filter((d) => !m.needs.some((n) => n.any.includes(d)));

export const SYSTEM_NOTICES = ["kind", "moved", "graphics"] as const;
export type SystemNotice = (typeof SYSTEM_NOTICES)[number];

export type LiveSystem = GameBase<SystemNotice> & {
  mode: "puzzle" | "free";
  plugged: Plugged;
  yaw: number;
  pitch: number;
  /** Runs tried on this mission, and whether the last one is shown. */
  runs: number;
  ran: boolean;
  done: boolean;
};

export const systemStart = (m: Mission | null): Pick<LiveSystem, "plugged" | "runs" | "ran" | "done"> => ({ plugged: { ...(m?.start ?? {}) }, runs: 0, ran: false, done: false });
export const SYSTEM_START: LiveSystem = { mode: "puzzle", stage: 0, said: null, yaw: 330, pitch: 38, ...systemStart(SYSTEM_LADDER[0]) };
export const systemMissionOf = (s: Pick<LiveSystem, "mode" | "stage">) => (s.mode === "puzzle" ? SYSTEM_LADDER[s.stage] ?? null : null);
/** Three stars on the first run with nothing spare, two within two runs, one after. */
export const systemStars = (runs: number, spare: number) => (runs <= 1 && spare === 0 ? 3 : runs <= 2 ? 2 : 1);
