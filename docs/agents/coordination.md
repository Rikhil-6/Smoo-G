# Coordination

When multiple agents work in the repo:

- Keep write scopes separated by folder.
- Do not rename or move files another agent is actively editing unless the team agrees.
- Prefer small commits over sweeping refactors.
- Use `frontend/` for UI work and `backend/` for adapter work.
- Check `docs/agents/work-queue.md` before starting new work.

If a task crosses the boundary, define the contract first, then implement each side independently.
