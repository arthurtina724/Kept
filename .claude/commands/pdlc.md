---
name: pdlc
description: "PDLC — Product Development Lifecycle commands (init, brainstorm, build, ship)"
argument-hint: <command> [args]
---

Route to the correct PDLC skill based on the first word in `$ARGUMENTS`.

Parse `$ARGUMENTS` as: `<command> [remaining-args]`

**Plugin root:** `/Users/jaytina/.npm/_npx/d6f1ba8f7bc872b2/node_modules/@pdlc-os/pdlc`

All skill file paths below are relative to the plugin root above.

| Command       | Action                                                         |
|---------------|----------------------------------------------------------------|
| `init`        | Read `/Users/jaytina/.npm/_npx/d6f1ba8f7bc872b2/node_modules/@pdlc-os/pdlc/skills/init/SKILL.md` and execute it. Pass remaining args as `$ARGUMENTS`. |
| `brainstorm`  | Read `/Users/jaytina/.npm/_npx/d6f1ba8f7bc872b2/node_modules/@pdlc-os/pdlc/skills/brainstorm/SKILL.md` and execute it. Pass remaining args as `$ARGUMENTS`. |
| `build`       | Read `/Users/jaytina/.npm/_npx/d6f1ba8f7bc872b2/node_modules/@pdlc-os/pdlc/skills/build/SKILL.md` and execute it. Pass remaining args as `$ARGUMENTS`. |
| `ship`        | Read `/Users/jaytina/.npm/_npx/d6f1ba8f7bc872b2/node_modules/@pdlc-os/pdlc/skills/ship/SKILL.md` and execute it. Pass remaining args as `$ARGUMENTS`. |
| `decision`    | Read `/Users/jaytina/.npm/_npx/d6f1ba8f7bc872b2/node_modules/@pdlc-os/pdlc/skills/decision/SKILL.md` and execute it. Pass remaining args as `$ARGUMENTS`. |
| `whatif`      | Read `/Users/jaytina/.npm/_npx/d6f1ba8f7bc872b2/node_modules/@pdlc-os/pdlc/skills/whatif/SKILL.md` and execute it. Pass remaining args as `$ARGUMENTS`. |
| `doctor`      | Read `/Users/jaytina/.npm/_npx/d6f1ba8f7bc872b2/node_modules/@pdlc-os/pdlc/skills/doctor/SKILL.md` and execute it. |
| `rollback`    | Read `/Users/jaytina/.npm/_npx/d6f1ba8f7bc872b2/node_modules/@pdlc-os/pdlc/skills/rollback/SKILL.md` and execute it. Pass remaining args as `$ARGUMENTS`. |
| `hotfix`      | Read `/Users/jaytina/.npm/_npx/d6f1ba8f7bc872b2/node_modules/@pdlc-os/pdlc/skills/hotfix/SKILL.md` and execute it. Pass remaining args as `$ARGUMENTS`. |
| `abandon`     | Read `/Users/jaytina/.npm/_npx/d6f1ba8f7bc872b2/node_modules/@pdlc-os/pdlc/skills/abandon/SKILL.md` and execute it. Pass remaining args as `$ARGUMENTS`. |
| `pause`       | Read `/Users/jaytina/.npm/_npx/d6f1ba8f7bc872b2/node_modules/@pdlc-os/pdlc/skills/pause/SKILL.md` and execute it. |
| `resume`      | Read `/Users/jaytina/.npm/_npx/d6f1ba8f7bc872b2/node_modules/@pdlc-os/pdlc/skills/resume/SKILL.md` and execute it. Pass remaining args as `$ARGUMENTS`. |
| `override-tier1` | Read `/Users/jaytina/.npm/_npx/d6f1ba8f7bc872b2/node_modules/@pdlc-os/pdlc/skills/override-tier1/SKILL.md` and execute it. Pass remaining args as `$ARGUMENTS`. |
| *(empty)*     | Read `docs/pdlc/memory/STATE.md` and resume from the last checkpoint per CLAUDE.md. |
| *(unknown)*   | **Before replying "unknown"**, check for a custom skill: look for `.pdlc/skills/<command>/SKILL.md` in the **project root**. If found, read and execute it. If not found, reply: "Unknown PDLC command: `<command>`. Available built-in commands: `init`, `brainstorm`, `build`, `ship`, `decision`, `whatif`, `doctor`, `rollback`, `hotfix`, `pause`, `resume`, `override-tier1`. Check `.pdlc/skills/` for custom skills." |

When executing a skill, follow every instruction in its `SKILL.md` completely — treat the skill file as your primary prompt for that phase.

**Path resolution rule:** All file paths referenced inside PDLC skill files (e.g. `skills/build/steps/01-pre-flight.md`, `agents/neo.md`, `templates/episode.md`) are relative to the **plugin root** above, NOT the project root. Prepend the plugin root when reading these files. Paths that start with `docs/pdlc/` are relative to the **project root** — these are the user's project files, not plugin files.

**Custom skills:** If `.pdlc/skills/` exists in the project root, skills found there are available as `/pdlc <skill-name>`. Custom skills are resolved from the **project root** (`.pdlc/skills/<name>/SKILL.md`), not the plugin root. Built-in PDLC skills take priority on name collisions.

**Custom agents:** If `.pdlc/agents/` exists in the project root, agent files found there are added to the roster. The orchestrator includes custom agents in meetings when task labels match their `auto_select_on_labels` frontmatter. Custom agents are resolved from the **project root** (`.pdlc/agents/<name>.md`).
