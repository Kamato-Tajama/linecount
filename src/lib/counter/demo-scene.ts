export type DemoKind = "box" | "crate" | "can" | "pack";

export type DemoItem = {
  id: number;
  x: number;
  lane: number;
  w: number;
  h: number;
  kind: DemoKind;
  tone: number;
  vx: number;
};

const KINDS: DemoKind[] = ["box", "crate", "can", "pack"];

export class DemoWorld {
  items: DemoItem[] = [];
  t = 0;
  spawnIn = 0.35;
  nextId = 1;

  reset() {
    this.items = [];
    this.spawnIn = 0.25;
    this.t = 0;
  }

  update(dt: number, width: number, height: number, speed: number, density: number) {
    this.t += dt;
    const vxScale = Math.max(140, width * 0.22) * speed;

    for (const item of this.items) {
      item.x += item.vx * vxScale * dt;
    }
    this.items = this.items.filter((item) => item.x < width + item.w);

    this.spawnIn -= dt * density;
    if (this.spawnIn <= 0) {
      this.spawn(width, height, speed);
      const gap = (0.85 + Math.random() * 1.15) / Math.max(0.45, density);
      this.spawnIn = gap;
    }
  }

  private spawn(width: number, height: number, speed: number) {
    const beltH = height * 0.3;
    const kind = KINDS[Math.floor(Math.random() * KINDS.length)] ?? "box";
    const scale = 0.72 + Math.random() * 0.5;
    const baseW =
      kind === "can" ? beltH * 0.42 : kind === "pack" ? beltH * 1.15 : beltH * 0.78;
    const baseH =
      kind === "can" ? beltH * 0.72 : kind === "pack" ? beltH * 0.38 : beltH * 0.62;
    const item: DemoItem = {
      id: this.nextId++,
      x: -baseW * scale - 8,
      lane: 0.18 + Math.random() * 0.52,
      w: baseW * scale,
      h: baseH * scale,
      kind,
      tone: Math.random(),
      vx: 0.92 + Math.random() * 0.16,
    };
    void width;
    void speed;
    this.items.push(item);
  }
}

export function drawDemoScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  world: DemoWorld,
  running: boolean,
) {
  ctx.fillStyle = "#10110f";
  ctx.fillRect(0, 0, width, height);

  const wash = ctx.createLinearGradient(0, 0, 0, height);
  wash.addColorStop(0, "rgba(232, 236, 226, 0.05)");
  wash.addColorStop(0.42, "rgba(232, 236, 226, 0)");
  wash.addColorStop(1, "rgba(0, 0, 0, 0.18)");
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, width, height);

  const beltTop = height * 0.4;
  const beltBot = height * 0.7;
  const beltH = beltBot - beltTop;

  ctx.fillStyle = "#181a16";
  ctx.fillRect(0, beltTop - 14, width, 14);
  ctx.fillStyle = "#2e312b";
  ctx.fillRect(0, beltTop - 3, width, 3);

  ctx.fillStyle = "#2a2c28";
  ctx.fillRect(0, beltTop, width, beltH);

  const pitch = Math.max(16, width * 0.028);
  const scroll = running ? (world.t * Math.max(140, width * 0.22)) % pitch : 0;
  ctx.strokeStyle = "rgba(0, 0, 0, 0.32)";
  ctx.lineWidth = 2;
  for (let x = -pitch + scroll; x < width + pitch; x += pitch) {
    ctx.beginPath();
    ctx.moveTo(x, beltTop);
    ctx.lineTo(x - beltH * 0.12, beltBot);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
  ctx.fillRect(0, beltTop, width, 8);

  for (const item of world.items) {
    const y = beltBot - 6 - item.lane * (beltH - item.h - 10);
    drawItem(ctx, item, y);
  }

  ctx.fillStyle = "#1a1c18";
  ctx.fillRect(0, beltBot, width, 16);
  ctx.fillStyle = "#3d4038";
  ctx.fillRect(0, beltBot, width, 2);

  ctx.fillStyle = "#161814";
  ctx.fillRect(0, beltBot + 16, width, height - beltBot - 16);
  ctx.fillStyle = "rgba(236, 238, 232, 0.04)";
  ctx.font = `500 ${Math.max(10, Math.round(height * 0.028))}px "IBM Plex Sans", sans-serif`;
  ctx.fillText("DEMO LINE  ·  simulated production belt", 14, beltBot + 32);
}

function drawItem(ctx: CanvasRenderingContext2D, item: DemoItem, y: number) {
  const { x, w, h, kind, tone } = item;
  if (kind === "can") {
    drawCan(ctx, x, y, w, h, tone);
    return;
  }
  if (kind === "pack") {
    drawPack(ctx, x, y, w, h, tone);
    return;
  }
  drawBox(ctx, x, y, w, h, kind === "crate", tone);
}

function drawBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  crate: boolean,
  tone: number,
) {
  const depth = Math.max(8, h * 0.28);
  const body = crate
    ? shade(86, 72, 54, tone)
    : shade(176 + tone * 16, 154, 118);
  const top = crate ? shade(108, 92, 68, tone) : shade(198, 178, 140, tone);
  const side = crate ? shade(70, 58, 42, tone) : shade(148, 128, 96, tone);

  ctx.fillStyle = side;
  ctx.beginPath();
  ctx.moveTo(x + w, y);
  ctx.lineTo(x + w + depth, y - depth);
  ctx.lineTo(x + w + depth, y - h - depth);
  ctx.lineTo(x + w, y - h);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = top;
  ctx.beginPath();
  ctx.moveTo(x, y - h);
  ctx.lineTo(x + depth, y - h - depth);
  ctx.lineTo(x + w + depth, y - h - depth);
  ctx.lineTo(x + w, y - h);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = body;
  ctx.fillRect(x, y - h, w, h);

  ctx.strokeStyle = "rgba(0, 0, 0, 0.22)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y - h, w, h);

  ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
  ctx.fillRect(x + 4, y - h + 4, w * 0.38, 3);

  if (crate) {
    ctx.strokeStyle = "rgba(40, 32, 20, 0.45)";
    ctx.strokeRect(x + 5, y - h + 5, w - 10, h - 10);
  } else {
    ctx.fillStyle = "rgba(40, 44, 36, 0.35)";
    ctx.fillRect(x + w * 0.18, y - h * 0.62, w * 0.64, h * 0.22);
  }
}

function drawCan(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  tone: number,
) {
  const body = shade(168, 174, 178, tone);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.roundRect(x, y - h, w, h, w * 0.18);
  ctx.fill();
  ctx.fillStyle = shade(210, 214, 216, tone);
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y - h + 4, w / 2, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(20, 24, 22, 0.28)";
  ctx.fillRect(x + 3, y - h * 0.62, w - 6, h * 0.28);
}

function drawPack(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  tone: number,
) {
  ctx.fillStyle = shade(214, 210, 198, tone);
  ctx.beginPath();
  ctx.roundRect(x, y - h, w, h, 4);
  ctx.fill();
  ctx.fillStyle = shade(130, 148, 142, tone);
  ctx.fillRect(x, y - h, w, 6);
  ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
  ctx.fillRect(x + w * 0.15, y - h * 0.7, w * 0.7, 4);
}

function shade(r: number, g: number, b: number, tone = 0.5) {
  const k = 0.88 + tone * 0.18;
  return `rgb(${Math.round(r * k)}, ${Math.round(g * k)}, ${Math.round(b * k)})`;
}
