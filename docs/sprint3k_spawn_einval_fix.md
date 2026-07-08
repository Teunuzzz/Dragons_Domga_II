# Sprint 3K Windows spawn EINVAL fix

Fixes the local Vite calibration API on Windows.

The auto calibration button starts Node and npm commands from inside the Vite dev server. On Windows, directly spawning `.cmd` files or executables with spaces in the path can throw `spawn EINVAL`. The updated `app/vite.config.ts` starts commands through `cmd.exe /d /s /c` on Windows and quotes all arguments.

This only affects local development. GitHub Pages remains static and cannot write calibration files.
