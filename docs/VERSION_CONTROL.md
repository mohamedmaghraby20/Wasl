# Version Control Rules

- Create a separate branch for each task, feature, fix, or refactor from the appropriate base branch (usually `main`).
- Use short, descriptive branch names: `feature/community-search`, `fix/button-colors`, `refactor/auth-service`.
- After completing each task, create a commit with a descriptive message, e.g. `fix: correct button colors`.
- After completing and committing each task, push its branch to the remote repository. Merge into `main` only after verification, then push the updated `main` branch. Never force-push.
- Run relevant checks and review changes before merging completed work into `main`. Resolve conflicts without overwriting other work.
- For parallel agents in the same repository, use separate branches and worktrees under `./worktrees/`; add `/worktrees/` to `.gitignore`.
- Merge parallel branches sequentially. After a successful merge, remove clean worktrees and merged local branches; preserve any uncommitted or unmerged work.
- Ignore `.env`, `.env.*`, and secrets; keep `.env.example` tracked with placeholders only. Never commit credentials or tokens.
- Check `git status` and staged changes before committing. Do not push, force-push, reset, clean, or rewrite history without explicit approval.
