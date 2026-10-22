import { describe, test, expect } from "bun:test";
import { spawnSync } from "node:child_process";

const run = (script, args = [], env = {}) =>
  spawnSync("bash", [`scripts/backup/${script}`, ...args], { env: { PATH: process.env.PATH, HOME: "/tmp", ...env }, encoding: "utf8" });

describe("backup scripts (no mongodump needed for these checks)", () => {
  for (const s of ["mongo-backup.sh", "mongo-verify.sh", "mongo-restore.sh"])
    test(`${s} is syntactically valid bash`, () => expect(spawnSync("bash", ["-n", `scripts/backup/${s}`]).status).toBe(0));
  test("backup refuses to run without DATABASE_URL", () => {
    const r = run("mongo-backup.sh", [], {});
    expect(r.status).not.toBe(0);
    expect(r.stderr).toContain("DATABASE_URL");
  });
  test("backup dry-run never prints the connection string", () => {
    const r = run("mongo-backup.sh", ["--dry-run"], { DATABASE_URL: "mongodb+srv://user:SuperSecret@cluster.example/x", BACKUP_DIR: "/tmp/bk" });
    expect(r.status).toBe(0);
    expect(r.stdout + r.stderr).not.toContain("SuperSecret");
    expect(r.stdout).toContain("pakBazar");
  });
  test("restore defaults to a separate database and guards in-place restore", () => {
    const env = { RESTORE_DATABASE_URL: "mongodb://x/y" };
    expect(run("mongo-restore.sh", ["a.gz", "--dry-run"], env).stdout).toContain("pakBazar_restore_check");
    const bad = run("mongo-restore.sh", ["a.gz", "--in-place"], env);
    expect(bad.status).not.toBe(0);
    expect(run("mongo-restore.sh", ["a.gz"], {}).stderr).toContain("RESTORE_DATABASE_URL");
  });
  test("verify detects a missing archive", () => expect(run("mongo-verify.sh", ["/nonexistent.gz"]).status).not.toBe(0));
});
