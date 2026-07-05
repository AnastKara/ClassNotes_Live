# TODO

- [ ] Identify why subject switch shows “still loading” and textarea disabled.
- [ ] Fix logic that disables textarea until `rooms[activeId]` exists; ensure it allows typing immediately (optimistic draft) and doesn’t block UI during initial room fetch.
- [ ] Add explicit per-room loading state instead of using `active` existence.
- [ ] Add debug logging for Firestore snapshot/loading failures.
- [ ] Validate behavior by running frontend and checking typing after switching subjects.

## Progress
- [x] Found gating: textarea uses `disabled={!canEdit || !active}` where `active = rooms[activeId]`.
- [ ] Implement optimistic draft + per-room loading so textarea never disables during subject switch.
- [ ] Add logging for rooms snapshot + room ids existence.

