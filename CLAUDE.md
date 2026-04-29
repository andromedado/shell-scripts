# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A collection of personal development utility scripts for working with Maven-based Java projects, local Tomcat deployments, Karate integration tests, and git workflows at 1stdibs. Scripts are intended to be on PATH and run directly from any project directory.

No build step — scripts run directly (Node.js or Bash). No `package.json`.

## Language Choice for New Utilities

Prefer Bash for new utilities. Use Node.js when the logic is complex enough to benefit from structured control flow, or when you need npm SDKs/libraries not readily available in shell.

## Scripts

| Script | Language | Purpose |
|--------|----------|---------|
| `deploy` | Node.js | Build and deploy Maven projects to local Tomcat; supports war/jar detection |
| `justthis` | Node.js | Standalone deploy: clean all deployments, rebuild, restart Tomcat |
| `karate` | Bash | Run Karate BDD integration tests against local or QA environments |
| `senv` | Node.js | Switch Tomcat's Consul environment config (qa, mario, luigi, ladmin, etc.) |
| `alignBE` | Bash | Validate/align backend-shared dependency versions between pom.xml and git tags |
| `stale-branches.sh` | Bash | List remote git branches with no commits in the past N days (default 180) |

## Shared Node.js Libraries (`lib/`)

**`lib/log.js`** — Logging helpers: `info()`, `fatal()` (exits 1), `finished()` (with timestamp), `stdoutWrite()` (carriage-return progress), `echo()`.

**`lib/exec.js`** — Core deployment logic:
- Process management: `isRunning()`, `ensureOff()`, `ensureRunning()`
- War/jar handling: `getBuiltWars()`, `removeAllExistingDeployments()`, `deploy()`
- Maven build: `build()` with streamed output
- Tomcat startup: `startTomcat()` (checks Memcached/ActiveMQ before starting)
- Java version guard: `checkJavaTarget()` reads pom.xml `<target>` and compares against `JAVA_HOME`
- Log cleanup: `removeLogs()` targets `/data/logs/tomcat` or `$HOME/data/logs/tomcat`

**`lib/deployStyles.js`** — Maven project type detection from pom.xml:
- `maven-war-plugin` → `DEPLOYABLE` (runs `clean package`)
- `maven-jar-plugin` / `protobuf-maven-plugin` → `BUILDABLE` (runs `install deploy`)
- Checks for SNAPSHOT vs release jars

## Key Environment Variables

- `CATALINA_HOME` — required by all deploy scripts
- `JAVA_HOME` — required; validated against pom.xml `<target>` version
- `TOMCAT_KEY`, `TOMCAT_ENV` — managed by `senv`; set in Tomcat's `startup.sh`

## `deploy` CLI Flags

```
--nobuild        Skip Maven build
--nostart        Skip Tomcat restart after deploy
--justthis       Remove all other deployments before deploying
--preservelogs   Don't delete Tomcat logs before restart
```

## `karate` Usage

```bash
karate                    # Run all Karate tests against localhost
karate -f path/to.feature # Run a single feature file
karate -e qa              # Run against QA environment (qabe-rest.qa.1stdibs.com)
```

## `senv` Environments

Valid environment names: `qa`, `mario`, `luigi`, `ladmin`, `lbuyer`, `lcron`. Modifies `-Dconfig.bucket` and `-Dhost.key` JVM args in `startup.sh`.

## Architecture Notes

- `justthis` is a self-contained copy of the deploy logic (no `lib/` imports) — changes to deploy behavior may need to be mirrored there.
- `deploy` and `justthis` auto-detect war vs jar projects by inspecting the local `pom.xml`.
- `ThreadCreationMonitor.java` is a BTrace script for JVM runtime instrumentation — not part of the deployment toolchain.
