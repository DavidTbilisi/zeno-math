// Interactive orthographic 3D viewer with orbit controls and PNG snapshots.
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { build3D, disposeObject } from "./build";
import type { Spec3D, View } from "./spec";

export type Snapshot = { dataURL: string; width: number; height: number };

export class Viewer {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 1000);
  private controls: OrbitControls;
  private content: THREE.Group | null = null;
  private lineMats: LineMaterial[] = [];
  private radius = 1;
  private resizeObserver: ResizeObserver;

  constructor(private host: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.setClearColor(0x000000, 0);
    host.appendChild(this.renderer.domElement);

    // Light follows the camera so the faces facing the viewer are always lit.
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.9));
    const light = new THREE.DirectionalLight(0xffffff, 1.3);
    light.position.set(-1, 2, 3);
    this.camera.add(light);
    this.scene.add(this.camera);
    this.camera.position.set(1, 1, 1);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enablePan = false;
    this.controls.minZoom = 0.3;
    this.controls.maxZoom = 5;
    this.controls.addEventListener("change", () => this.render());

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    this.resize();
  }

  private size() {
    const w = Math.max(200, this.host.clientWidth);
    return { w, h: Math.round(w * 0.62) };
  }

  private resize() {
    const { w, h } = this.size();
    this.renderer.setSize(w, h);
    for (const m of this.lineMats) m.resolution.set(w, h);
    this.updateFrustum();
    this.render();
  }

  private updateFrustum() {
    const { w, h } = this.size();
    const half = this.radius * 1.12;
    const aspect = w / h;
    Object.assign(this.camera, { left: -half * aspect, right: half * aspect, top: half, bottom: -half });
    this.camera.near = 0.01;
    this.camera.far = this.radius * 20;
    this.camera.updateProjectionMatrix();
  }

  /** Replaces the content, keeping the current viewing direction and zoom. */
  show(spec: Spec3D) {
    if (this.content) {
      this.scene.remove(this.content);
      disposeObject(this.content);
    }
    const built = build3D(spec);
    this.content = built.group;
    this.lineMats = built.lineMats;
    this.scene.add(built.group);

    const sphere = built.fitBox.isEmpty() ? new THREE.Sphere(new THREE.Vector3(), 1) : built.fitBox.getBoundingSphere(new THREE.Sphere());
    this.radius = Math.max(sphere.radius, 0.5);
    const dir = this.camera.position.clone().sub(this.controls.target).normalize();
    this.controls.target.copy(sphere.center);
    this.camera.position.copy(sphere.center).addScaledVector(dir, this.radius * 6);
    this.controls.update();
    this.resize();
  }

  setView(v: View) {
    const offset = new THREE.Vector3().setFromSphericalCoords(this.radius * 6, v.polar, v.azimuth);
    this.camera.position.copy(this.controls.target).add(offset);
    this.camera.zoom = v.zoom;
    this.camera.updateProjectionMatrix();
    this.controls.update();
    this.render();
  }

  getView(): View {
    return { azimuth: this.controls.getAzimuthalAngle(), polar: this.controls.getPolarAngle(), zoom: this.camera.zoom };
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  /** Renders a PNG cropped to the drawn content, with optional caption lines underneath. */
  snapshot(caption: string[], matrix?: { rows: string[][]; colors: string[] }): Snapshot {
    this.render();
    const src = this.renderer.domElement;
    const dpr = this.renderer.getPixelRatio();

    const tmp = document.createElement("canvas");
    tmp.width = src.width;
    tmp.height = src.height;
    const tctx = tmp.getContext("2d", { willReadFrequently: true })!;
    tctx.drawImage(src, 0, 0);
    const { data } = tctx.getImageData(0, 0, tmp.width, tmp.height);
    let x0 = tmp.width, y0 = tmp.height, x1 = 0, y1 = 0;
    for (let y = 0; y < tmp.height; y++)
      for (let x = 0; x < tmp.width; x++)
        if (data[(y * tmp.width + x) * 4 + 3] > 8) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
    if (x1 < x0) [x0, y0, x1, y1] = [0, 0, tmp.width - 1, tmp.height - 1];

    const pad = Math.round(12 * dpr);
    const fontPx = 17 * dpr;
    const lineH = Math.round(26 * dpr);
    const font = `600 ${fontPx}px "Segoe UI", Helvetica, Arial, sans-serif`;
    tctx.font = font;
    const capW = Math.max(0, ...caption.map((l) => tctx.measureText(l).width));
    const cw = x1 - x0 + 1;
    const ch = y1 - y0 + 1;

    // Optional matrix block "M = ( … )" to the left of the caption, columns colored.
    const cellGap = Math.round(14 * dpr);
    const colW = matrix ? matrix.rows[0].map((_, j) => Math.max(...matrix.rows.map((r) => tctx.measureText(r[j]).width))) : [];
    const labelW = matrix ? tctx.measureText("M =").width + cellGap : 0;
    const matW = matrix ? labelW + colW.reduce((s, w) => s + w, 0) + cellGap * (colW.length + 1) + 8 * dpr : 0;
    const matH = matrix ? matrix.rows.length * lineH : 0;
    const bottomH = Math.max(matH, caption.length * lineH);
    const bottomW = matW + (matrix && caption.length ? 2 * cellGap : 0) + capW;

    const out = document.createElement("canvas");
    out.width = Math.ceil(Math.max(cw, bottomW) + 2 * pad);
    out.height = Math.ceil(ch + 2 * pad + (bottomH ? bottomH + pad / 2 : 0));
    const o = out.getContext("2d")!;
    o.drawImage(tmp, x0, y0, cw, ch, (out.width - cw) / 2, pad, cw, ch);
    o.font = font;
    o.textBaseline = "top";
    const top = pad + ch + pad / 2;

    if (matrix) {
      o.fillStyle = "#1e1e1e";
      o.fillText("M =", pad, top + (matH - lineH) / 2 + 3 * dpr);
      const left = pad + labelW;
      const right = pad + matW - 8 * dpr;
      o.strokeStyle = "#1e1e1e";
      o.lineWidth = 1.6 * dpr;
      for (const [x, dir] of [[left, 1], [right, -1]] as const) {
        o.beginPath();
        o.moveTo(x + dir * 7 * dpr, top);
        o.quadraticCurveTo(x, top + matH / 2, x + dir * 7 * dpr, top + matH);
        o.stroke();
      }
      o.textAlign = "center";
      let cx = left + cellGap;
      colW.forEach((w, j) => {
        o.fillStyle = matrix.colors[j] ?? "#1e1e1e";
        matrix.rows.forEach((r, i) => o.fillText(r[j], cx + w / 2, top + i * lineH + 3 * dpr));
        cx += w + cellGap;
      });
      o.textAlign = "left";
    }
    o.fillStyle = "#1e1e1e";
    const capX = pad + (matrix ? matW + 2 * cellGap : 0);
    const capTop = top + (bottomH - caption.length * lineH) / 2;
    caption.forEach((l, i) => o.fillText(l, capX, capTop + i * lineH));

    return { dataURL: out.toDataURL("image/png"), width: Math.round(out.width / dpr), height: Math.round(out.height / dpr) };
  }

  dispose() {
    this.resizeObserver.disconnect();
    this.controls.dispose();
    if (this.content) disposeObject(this.content);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
