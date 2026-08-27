---
name: Package firewall and Git dependencies
description: How to handle firewall failures caused by npm preparing a Git dependency from source.
---

When npm fails inside “git dep preparation,” trace the Git-sourced transitive package before adding a direct override for the blocked package. Prefer updating its parent to a compatible registry release that no longer uses the Git dependency.

**Why:** npm prepares Git dependencies from source and may install their outdated development dependencies, even when those packages are not part of the app’s runtime tree. Replit’s package firewall can correctly block those hidden dependencies.

**How to apply:** Inspect the failure log for “git dep preparation,” find Git URLs in the lockfile, identify the direct parent, and update that parent within the project’s existing compatibility constraints. Use narrow overrides only for remaining transitive packages whose parent range already permits the fixed release.