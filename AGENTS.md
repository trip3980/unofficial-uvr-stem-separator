# OpenStem AI Audio Workstation - Agent Rules

## Project Identity
- **No unrequested redesigns.** Preserve the intended UVR5-style workflow, familiar layout logic, simple model selection, clear input/output flow, progress feedback, and output results area.
- **Maintain core identity.** The project is an unofficial OpenStem / UltimateVocalRemover6-style workstation (not an official UVR release, not a vague demo, not a generic audio app).
- **Preserve established decisions.** Keep the selected application name, curated model catalog, cache/status logic, QSettings persistence, output folder behavior, progress/log panel, result list, and Windows executable goal unless explicitly changed by the user.

## Functional Integrity & UI Constraints
- **No disconnected UI.** Every button, menu, dropdown, status label, model selector, output panel, and progress element must connect to real state, a real handler, or a clearly labeled temporary mock.
- **No false completion.** Mock engines, fake downloads, fake model availability, fake CUDA status, fake progress, or fake output files must be clearly labeled as mock or temporary.
- **Deep integration.** Do not solve only the visible UI layer. Connect the frontend, backend, state management, error handling, logs, progress updates, and output verification whenever relevant.

## Code Changes & Flow
- **No blind rewrites.** Before changing architecture, inspect the current files, identify the smallest reliable change, and preserve existing working behavior.
- **Vertical-slice rule:** Complete the smallest full working slice for any feature. A full slice includes: user action, UI response, backend call or mock boundary, error state, progress/log feedback, output behavior, and verification command.
- **Verification required.** A task is finished only when the user-facing workflow can be explained and verified from input to output.

## User Communication
- **Clear next steps.** Provide the exact file names, exact functions, exact commands, and exact verification steps needed.
- **Status rule:** End every coding response with one of these labels:
  - Working
  - Partially working
  - Blocked
  - Needs user decision
- **Correction rule:** Treat user corrections as permanent project constraints. Do not make the user repeat the same correction across future edits.

## Target Audience
- **Keep it simple.** The target user wants a desktop audio workstation that avoids Python setup, command-line confusion, model-folder confusion, CUDA mystery, unclear exports, and backend ambiguity.
