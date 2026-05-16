> Project-specific cleanup instructions for this repository. Not an orchestra skill.

## Trigger

- "cleanup"
- "clean up the codebase"
- "run project cleanup"

## When to use

Use when you want to remove build artefacts, clear the dist/ folder, and run the project-specific lint fix script.

## Process

1. Delete `dist/` folder.
2. Run `npm run lint:fix`.
3. Run `npm run format`.
4. Report any unfixable lint errors.

## Output

List of files changed and any remaining lint errors.
