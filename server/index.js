// server/index.js  (ESM)

import express from "express";
import { WebSocketServer } from "ws";
import pty from "node-pty";               // ✅ ESM-friendly import
const { spawn } = pty;

import { nanoid } from "nanoid";
import fs from "fs/promises";
import fssync from "fs";
import path from "path";
import os from "os";
import multer from "multer";
import cors from "cors";
import { spawn as cpSpawn } from "child_process";
import attachPythonWS from "./python-ws.js";   // ✅ file is beside index.js in /server

const USE_DOCKER = process.env.SANDBOX !== "local"; // "local" on Render

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const upload = multer({ storage: multer.memoryStorage() });

const JOB_ROOT = path.join(os.tmpdir(), "oc-jobs");
if (!fssync.existsSync(JOB_ROOT)) fssync.mkdirSync(JOB_ROOT, { recursive: true });

const SESSIONS = new Map();

// ---------------- helpers ----------------
const javacRegex = /^(.+?):(\d+):(?:(\d+):)?\s+(error|warning):\s+(.*)$/gm;
function parseJavac(stderr) {
  const out = []; let m;
  while ((m = javacRegex.exec(stderr)) !== null) {
    out.push({
      file: m[1],
      line: Number(m[2]),
      column: m[3] ? Number(m[3]) : 1,
      severity: m[4] === "warning" ? "warning" : "error",
      message: m[5].trim(),
    });
  }
  return out;
}
function execCapture(cmd, args) {
  return new Promise((resolve) => {
    const cp = cpSpawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "", err = "";
    cp.stdout.on("data", d => out += d.toString());
    cp.stderr.on("data", d => err += d.toString());
    cp.on("close", code => resolve({ stdout: out + err, exitCode: code ?? 0 }));
  });
}

// --------------- routes ------------------
app.post("/api/java/prepare", async (req, res, next) => {
  try {
    const { files = [], mainClass = "Main" } = req.body || {};
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: "No files provided" });
    }

    const jobId = nanoid();
    const jobDir = path.join(JOB_ROOT, jobId);
    await fs.mkdir(jobDir, { recursive: true });

    await Promise.all(
      files.map(async f => {
        const p = path.normalize(f.path);
        if (p.startsWith("..")) throw new Error("Invalid path");
        const full = path.join(jobDir, p);
        await fs.mkdir(path.dirname(full), { recursive: true });
        await fs.writeFile(full, f.content ?? "", "utf8");
      })
    );

    let compileLog = "";
    let diagnostics = [];
    let ok = false;

    if (USE_DOCKER) {
      const compileCmd = [
        "run","--rm","--network","none",
        "--cpus","1.0","--memory","512m","--pids-limit","256",
        "-v", `${jobDir}:/workspace:rw`, "-w","/workspace",
        "oc-java:17","bash","-lc",
        `shopt -s nullglob; files=( *.java ); if (( \${#files[@]} )); then javac -Xlint:all -Xdiags:verbose "\${files[@]}" 2>&1; else echo "No .java files"; fi; true`
      ];
      const out = await execCapture("docker", compileCmd);
      compileLog = out.stdout;
      diagnostics = parseJavac(compileLog);
      ok = diagnostics.every(d => d.severity !== "error");
    } else {
      const script =
        `cd "${jobDir}"; shopt -s nullglob; files=( *.java ); ` +
        `if (( \${#files[@]} )); then javac -Xlint:all -Xdiags:verbose "\${files[@]}" 2>&1; else echo "No .java files"; fi; true`;
      const out = await execCapture("bash", ["-lc", script]);
      compileLog = out.stdout;
      diagnostics = parseJavac(compileLog);
      ok = diagnostics.every(d => d.severity !== "error");
    }

    const token = nanoid();
    SESSIONS.set(token, { jobDir, mainClass });

    return res.json({ token, ok, diagnostics, compileLog });
  } catch (e) {
    next(e);
  }
});

// --------------- websockets --------------
const PORT = Number(process.env.PORT) || 8080;     // ✅ listen on Render’s PORT
const server = app.listen(PORT, () => {
  console.log("Server on :", PORT);
});

// Python WS at /python
attachPythonWS(server);

// Java WS at /term (no manual server.on('upgrade'))
const javaWSS = new WebSocketServer({ server, path: "/term" });

javaWSS.on("connection", (ws, req) => {
  const url = new URL(req.url, "http://localhost");
  const token = url.searchParams.get("token");
  const sess = SESSIONS.get(token);
  if (!sess) { ws.close(); return; }
  const { jobDir, mainClass } = sess;

  let term;
  if (USE_DOCKER) {
    const args = [
      "run","--rm","-i","--network","none",
      "--cpus","1.0","--memory","512m","--pids-limit","256",
      "-v", `${jobDir}:/workspace:rw`, "-w","/workspace",
      "oc-java:17","bash","-lc", `java ${mainClass}`
    ];
    term = spawn("docker", args, { name: "xterm-color", cols: 80, rows: 24 });
  } else {
    const JAVA_OPTS = process.env.JAVA_TOOL_OPTIONS
      || "-Xms32m -Xmx128m -XX:MaxMetaspaceSize=64m -XX:+UseSerialGC -Xss512k";
    const runCmd = `ulimit -t 5; cd "${jobDir}"; java ${JAVA_OPTS} ${mainClass}`;
    term = spawn("bash", ["-lc", runCmd], {
      name: "xterm-color", cols: 80, rows: 24, cwd: jobDir, env: process.env
    });
  }

  term.onData(d => ws.send(JSON.stringify({ type:"stdout", data:d })));
  term.onExit(({ exitCode }) => {
    ws.send(JSON.stringify({ type:"exit", code: exitCode }));
    ws.close();
    setTimeout(() => fssync.rmSync(jobDir, { recursive: true, force: true }));
    SESSIONS.delete(token);
  });

  ws.on("message", (m) => {
    try {
      const msg = JSON.parse(m.toString());
      if (msg.type === "stdin") term.write(msg.data);
      if (msg.type === "resize") term.resize(msg.cols || 80, msg.rows || 24);
    } catch {}
  });
  ws.on("close", () => { try { term.kill(); } catch {} });
});

// --------------- errors ------------------
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: String(err.message || err) });
});
