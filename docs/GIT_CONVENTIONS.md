# Git Conventions

- Before editing code create a separate branch for each task, feature, fix, or refactor from the appropriate base branch (usually `main`).
- Use short, descriptive branch names: `feature/community-search`, `fix/button-colors`, `refactor/auth-service`.
- Check `git status` and staged changes before committing.
- After completing each task, create a commit with a descriptive message, e.g. `fix: correct button colors` for that branch.
- After completing and committing, push the branch to the remote repository. 
- Merge into `main` only after verification, then push the updated `main` branch. Never force-push.
- For parallel agents in the same repository, use separate branches and worktrees under `./worktrees/`; make sure `/worktrees/` is added `.gitignore`.
- Merge parallel branches sequentially. After a successful merge, remove clean worktrees and merged local branches; preserve any uncommitted or unmerged work then follow the previous steps.

