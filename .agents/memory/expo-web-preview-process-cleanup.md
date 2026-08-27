---
name: Expo web preview process cleanup
description: Covers false port conflicts caused by orphaned Expo web processes after workflow failures.
---

A failed Expo web workflow can leave its Expo CLI child process alive even after the workflow is reported stopped, causing later starts to pause at an interactive “port is running this app in another window” prompt.

**Why:** The stale process may own no listening socket, so checking the port alone reports it free while Expo still detects its own old process and refuses to start non-interactively.

**How to apply:** When a web workflow repeatedly reports the same Expo PID and port conflict after being stopped, inspect the process tree as well as active listeners. Terminate only the confirmed orphaned Expo web process, then restart the managed workflow.