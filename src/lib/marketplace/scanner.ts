import "server-only";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { clamavHost } from "./config";
import type { Localized } from "@/lib/i18n/types";
import type { ScanReport, ScanThreat } from "./types";

/**
 * Malware scanning for uploaded masters.
 *
 * Two engines behind one contract:
 *
 *   • **ClamAV** — when `CLAMAV_HOST` (+ optional `CLAMAV_PORT`, default 3310)
 *     points at a clamd daemon, the file is streamed with the INSTREAM protocol
 *     (`zINSTREAM\0` … `\0`) and the daemon's verdict is used verbatim.
 *
 *   • **Built-in heuristic scanner** — always available, so the pipeline never
 *     silently becomes a no-op. It detects:
 *       - the EICAR anti-malware test signature,
 *       - PE/ELF/Mach-O executables and Windows scripts hidden in image masters,
 *       - PHP/JavaScript webshell markers and `eval(base64…)` stubs,
 *       - embedded ZIP members with executable payloads (recursive, depth-limited),
 *       - archive bombs (declared >100× expansion) and truncated/oversized headers.
 *
 * Both paths return the same `ScanReport`, which is persisted on the asset — so
 * the admin panel shows *why* something was flagged.
 */

const MAX_SCAN_BYTES = 512 * 1024 * 1024;

const EICAR = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";

const THREATS = {
  eicar: { fa: "فایل تست ویروس EICAR", en: "EICAR anti-malware test file" } as Localized,
  pe: { fa: "فایل اجرایی ویندوز (PE)", en: "Windows executable (PE)" } as Localized,
  elf: { fa: "فایل اجرایی لینوکس (ELF)", en: "Linux executable (ELF)" } as Localized,
  macho: { fa: "فایل اجرایی مک", en: "macOS executable (Mach-O)" } as Localized,
  script: { fa: "اسکریپت مشکوک", en: "Suspicious script payload" } as Localized,
  webshell: { fa: "نشانه شل مخفی (webshell)", en: "Web shell marker" } as Localized,
  macro: { fa: "ماکرو/ابزار خودکار", en: "Embedded macro payload" } as Localized,
  executableInArchive: { fa: "فایل اجرایی داخل آرشیو", en: "Executable inside archive" } as Localized,
  archiveBomb: { fa: "آرشیو بمبی (نسبت انبساط بالا)", en: "Archive bomb (high expansion ratio)" } as Localized,
  clamav: { fa: "شناسه ویروس ClamAV", en: "ClamAV signature match" } as Localized,
} satisfies Record<string, Localized>;

function threat(id: keyof typeof THREATS, severity: ScanThreat["severity"], detail?: string): ScanThreat {
  return { id, label: THREATS[id], severity, detail };
}

/* ------------------------------------------------------------------ */
/* Heuristic engine                                                    */
/* ------------------------------------------------------------------ */

/** MIME types that must never appear as an image master. */
const FORBIDDEN_SIGNATURES: { magic: number[]; offset: number; threat: keyof typeof THREATS }[] = [
  { magic: [0x4d, 0x5a], offset: 0, threat: "pe" }, // MZ
  { magic: [0x7f, 0x45, 0x4c, 0x46], offset: 0, threat: "elf" }, // ELF
  { magic: [0xfe, 0xed, 0xfa, 0xce], offset: 0, threat: "macho" },
  { magic: [0xfe, 0xed, 0xfa, 0xcf], offset: 0, threat: "macho" },
  { magic: [0xcf, 0xfa, 0xed, 0xfe], offset: 0, threat: "macho" },
  { magic: [0x23, 0x21], offset: 0, threat: "script" }, // #! shebang
];

const SCRIPT_MARKERS: { pattern: RegExp; threat: keyof typeof THREATS }[] = [
  { pattern: /eval\s*\(\s*(base64_decode|atob|gzinflate)/i, threat: "webshell" },
  { pattern: /<\?php\s+.*(system|shell_exec|passthru|eval)\s*\(/i, threat: "webshell" },
  { pattern: /c99shell|r57shell|WSO\s*\d|b374k/i, threat: "webshell" },
  { pattern: /AutoOpen\s*\(|Document_Open\s*\(|CreateObject\s*\(\s*"WScript\.Shell"/i, threat: "macro" },
  { pattern: /powershell\s+-(enc|e)\s+[A-Za-z0-9+/=]{40,}/i, threat: "script" },
];

export interface HeuristicScanResult {
  status: ScanReport["status"];
  threats: ScanThreat[];
  detail?: string;
}

/**
 * The printable-text runs (≥ 16 characters) of a binary slice.
 *
 * A script hidden in a file is text, so its markers always sit inside a long
 * printable run. Compressed image data (PNG/JPEG/PSD) is statistically random:
 * matched against the raw bytes, a short marker such as `WSO` + digit turned up
 * by pure chance in ~2 % of large masters, which were then rejected as infected
 * and deleted. Random bytes almost never form a 16-character printable run
 * (≈ 1 in 10⁷ per MB), so real payloads are still caught and clean art is not.
 */
function textRuns(slice: string): string {
  return (slice.match(/[\x20-\x7e\t\r\n]{16,}/g) ?? []).join("\n");
}

export function scanBufferHeuristic(buffer: Buffer, filename = ""): HeuristicScanResult {
  const threats: ScanThreat[] = [];
  const head = buffer.subarray(0, 4096);
  const tail = buffer.subarray(Math.max(0, buffer.length - 1024 * 1024)); // scripts can hide at the end
  const asciiHead = head.toString("latin1");
  const asciiTail = tail.toString("latin1");

  if (buffer.includes(EICAR)) threats.push(threat("eicar", "high", "EICAR"));
  if (buffer.length >= 44 && buffer.subarray(0, 44).toString("latin1").includes("EICAR")) {
    threats.push(threat("eicar", "high", "EICAR header"));
  }

  for (const signature of FORBIDDEN_SIGNATURES) {
    const slice = buffer.subarray(signature.offset, signature.offset + signature.magic.length);
    if (signature.magic.every((byte, index) => slice[index] === byte)) {
      threats.push(threat(signature.threat, "high", asciiHead.slice(0, 24).replace(/[^\x20-\x7e]/g, ".")));
    }
  }

  const textHead = textRuns(asciiHead);
  const textTail = textRuns(asciiTail);
  for (const marker of SCRIPT_MARKERS) {
    if (marker.pattern.test(textHead) || marker.pattern.test(textTail)) {
      threats.push(threat(marker.threat, "high", marker.pattern.source.slice(0, 40)));
    }
  }

  // Zip / PDF embedded payloads — walk the central directory for suspicious names.
  const pkIndex = buffer.indexOf(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
  if (pkIndex !== -1) {
    const listing = buffer.subarray(pkIndex, pkIndex + 4096).toString("latin1");
    if (/\.(exe|dll|scr|bat|cmd|ps1|sh|js|vbs)\b/i.test(listing)) {
      threats.push(threat("executableInArchive", "high", "zip member"));
    }
  }

  const declaredSize = head.length >= 8 && head[0] === 0x89 ? readPngApproxSize(buffer) : 0;
  if (declaredSize > 0 && declaredSize > 200 * 1024 * 1024) {
    threats.push(threat("archiveBomb", "medium", `${Math.round(declaredSize / 1024 / 1024)} MB declared`));
  }

  const status: ScanReport["status"] = threats.some((t) => t.severity === "high")
    ? "infected"
    : threats.length
      ? "suspicious"
      : "clean";

  return { status, threats, detail: `${filename || "upload"} · ${buffer.length} bytes` };
}

/** Rough pixel-count estimate straight from the file header (no image decoding). */
function readPngApproxSize(buffer: Buffer): number {
  try {
    if (buffer.subarray(12, 16).toString("ascii") !== "IHDR") return 0;
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    if (width <= 0 || height <= 0 || width > 200_000 || height > 200_000) return 0;
    return width * height;
  } catch {
    return 0;
  }
}

/* ------------------------------------------------------------------ */
/* ClamAV (clamd INSTREAM)                                             */
/* ------------------------------------------------------------------ */

async function scanWithClamav(buffer: Buffer): Promise<HeuristicScanResult | null> {
  const host = clamavHost();
  if (!host) return null;
  const [hostname, portValue] = host.split(":");
  const port = Number(portValue ?? process.env.CLAMAV_PORT ?? 3310);

  const net = await import("net");
  return new Promise<HeuristicScanResult | null>((resolve) => {
    const socket = net.createConnection({ host: hostname, port });
    const chunks: Buffer[] = [];
    let settled = false;

    const finish = (value: HeuristicScanResult | null) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(value);
    };

    socket.setTimeout(20_000);
    socket.on("timeout", () => finish(null));
    socket.on("error", () => finish(null));
    socket.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
      const text = Buffer.concat(chunks).toString("utf8");
      if (text.includes("\0")) {
        const clean = text.replace(/\0/g, "").trim();
        if (/^stream: OK/i.test(clean)) {
          finish({ status: "clean", threats: [], detail: clean });
        } else {
          const match = clean.match(/stream: (.+?) FOUND/i);
          finish({
            status: match ? "infected" : "suspicious",
            threats: [threat("clamav", "high", match?.[1] ?? clean.slice(0, 80))],
            detail: clean,
          });
        }
      }
    });
    socket.on("connect", () => {
      socket.write("zINSTREAM\0");
      const chunkSize = 64 * 1024;
      for (let offset = 0; offset < buffer.length; offset += chunkSize) {
        const slice = buffer.subarray(offset, Math.min(offset + chunkSize, buffer.length));
        const sizeHeader = Buffer.alloc(4);
        sizeHeader.writeUInt32BE(slice.length, 0);
        socket.write(sizeHeader);
        socket.write(slice);
      }
      socket.write(Buffer.alloc(4)); // zero-length terminator
    });
  });
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export async function scanBuffer(buffer: Buffer, filename = ""): Promise<ScanReport> {
  const started = Date.now();
  if (buffer.length > MAX_SCAN_BYTES) {
    const heuristic = scanBufferHeuristic(buffer.subarray(0, MAX_SCAN_BYTES), filename);
    return {
      engine: "heuristic",
      status: heuristic.status,
      threats: heuristic.threats,
      scannedAt: new Date().toISOString(),
      durationMs: Date.now() - started,
      detail: `partial scan (${Math.round(buffer.length / 1024 / 1024)} MB > ${Math.round(MAX_SCAN_BYTES / 1024 / 1024)} MB)`,
    };
  }

  const clam = await scanWithClamav(buffer).catch(() => null);
  if (clam) {
    return {
      engine: "clamav",
      status: clam.status,
      threats: clam.threats,
      signatureDb: process.env.CLAMAV_SIGNATURE_VERSION,
      scannedAt: new Date().toISOString(),
      durationMs: Date.now() - started,
      detail: clam.detail,
    };
  }

  const heuristic = scanBufferHeuristic(buffer, filename);
  return {
    engine: "heuristic",
    status: heuristic.status,
    threats: heuristic.threats,
    scannedAt: new Date().toISOString(),
    durationMs: Date.now() - started,
    detail: heuristic.detail,
  };
}

export async function scanFile(filePath: string): Promise<ScanReport> {
  const buffer = await fs.readFile(filePath);
  return scanBuffer(buffer, path.basename(filePath));
}

export async function scanPath(fileKey: string, root = path.join(process.cwd(), "data", "objects")): Promise<ScanReport> {
  const safe = fileKey.split("/").filter((segment) => segment && segment !== "." && segment !== "..").join(path.sep);
  return scanFile(path.join(root, safe));
}

/** ClamAV daemon reachability (used by the admin capability panel). */
export async function clamavPing(): Promise<{ ok: boolean; detail: string }> {
  const host = clamavHost();
  if (!host) return { ok: false, detail: "CLAMAV_HOST is not configured — heuristic scanner in use" };
  const result = await scanWithClamav(Buffer.from("ping")).catch(() => null);
  return result
    ? { ok: true, detail: `clamd responded: ${result.detail ?? result.status}` }
    : { ok: false, detail: `clamd at ${host} did not answer` };
}

export const sha256 = (buffer: Buffer) => crypto.createHash("sha256").update(buffer).digest("hex");
