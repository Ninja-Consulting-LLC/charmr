# Release safety

High-risk areas: LLM provider, prompt assembly, auth, rate limits, subscription sync.

1. **Prefer feature flags or env toggles** for switching AI backends or experimental prompts.
2. **Staged rollout:** internal builds → small cohort → full release.
3. **Kill switch:** document who can disable generation (env flag, maintenance mode, or provider key rotation).
4. **Checklist:** cross-check `docs/TESTING_AND_COVERAGE.md` capability rows before promoting to production.
