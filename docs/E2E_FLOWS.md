# Charmr iOS E2E — exhaustive flow catalog (Maestro)

**Canonical location:** this file (`docs/E2E_FLOWS.md`) is the single **exhaustive** map of user journeys, automation status, Maestro assets, and backlog.  
**Companion:** [`TESTING_AND_COVERAGE.md`](TESTING_AND_COVERAGE.md) links here for pyramid context.

**Runner:** `npm run test:e2e` runs **only** `.maestro/[0-9][0-9]_*.yaml` (numbered flows). Shared steps live under `.maestro/include/` and run **only** via `runFlow` (never executed as standalone suites).  
**Stub LLM suite:** `npm run test:e2e:stub-llm` runs `.maestro/stub/*.yaml` — start the API with `CHARMR_E2E_STUB_LLM=true` (see §3).  
**Fast iteration:** `npm run test:e2e:flow -- <basename>` (starts Metro on 8081 unless `CHARMR_E2E_SKIP_METRO=1`).  
**Numbering:** Flow IDs are **not** contiguous (retired numbers: `06`, `09`, `10`, `12`, `13`, `16`, `21` merged into `05`, `07`, `08`).

**Prerequisites for API-backed flows:** Anonymous skip, match hide/restore, coach, and feedback submit call `config.apiBaseUrl`. Point the app at a running backend (or staging) or those flows will time out or fail. For local backend without SMTP, use **`CHARMR_DEV_MOCK_EMAIL=1`** (see `backend/src/services/email/index.ts`). **Contract check:** `npm run test:e2e:verify-api` curls `GET /health` + `POST /api/support` with `email`, **`phone`**, `message`, … (development auth bypass).

---

## 1. Capability matrix (exhaustive checklist)

| ID | Capability / journey | Risk if untested | Automated | Maestro / notes |
|----|----------------------|------------------|-----------|-----------------|
| **A1** | Cold launch → logged-out shell (Get Started, Log In) | Dead onboarding | ✅ | `01_login_cold_start` (`get-started-button`, `login-button`, copy) |
| **A2** | Login modal opens; Google / Facebook / Apple entry points | OAuth wiring broken silently | ✅ UI only | `02_login_modal_providers` |
| **A3** | Google Sign-In **completes** (token + backend user) | Acquisition | 🔶 | **Handoff:** `optional/oauth_google_handoff.yaml` → finish in system UI |
| **A4** | Apple Sign-In **completes** | iOS policy / trust | 🔶 | **Handoff:** `optional/oauth_apple_handoff.yaml` |
| **A5** | Facebook Sign-In **completes** | Secondary auth | 🔶 | **Handoff:** `optional/oauth_facebook_handoff.yaml` |
| **A6** | Session restore (no `clearState` relaunch) | Support load | ✅ | `14_session_restore_home` |
| **B1** | Onboarding step 1 (keyboard copy + primary actions) | Wrong expectations | ✅ partial | `04_onboarding_step_through` |
| **B2** | Onboarding step 2 (keyboard selection) | Funnel | ✅ partial | `04_onboarding_step_through` |
| **B3** | Onboarding step 3 (register CTA) | Funnel | ✅ partial | `04_onboarding_step_through` |
| **B4** | Skip onboarding → anonymous user persisted → Home | Core funnel | ✅ | `03_onboarding_skip_to_home` (needs API) |
| **B5** | Onboarding **Register** opens login modal (cancel returns) | Registered funnel | ✅ | `11_onboarding_register_opens_login` |
| **B6** | Account menu **Create account** → login modal (cancel) | Same as B5 from menu | ✅ | `26_menu_register_opens_login` (`user-menu-register-account`) |
| **C1** | Home: header, coach CTA, feedback FAB | Navigation | ✅ | `03`, `05`, `07`, `08`, `15`, `19`, `26`, `28` |
| **C2** | Dating Coach → match picker opens | Coach dead | ✅ | `07`, `08`, `15`, includes |
| **C3** | Add match (name + platform + save) | CRUD | ✅ | `07`, includes (preset **hinge** / **tinder** / **bumble**) |
| **C3b** | Add match **Other** + custom platform string | CRUD edge | ✅ | `24_coach_add_match_other_platform` (`platform-other-button` → **`platform-other-field`** → `add-button`) |
| **C4** | Open coach chat for selected match | Blank coach | ✅ | `07` (`coach-chat-match-name`, composer) |
| **C5** | Coach chat: send + coach reply text | Core product | ✅ partial | Composer covered in **`07`** · **stub send:** `stub/01` (needs `CHARMR_E2E_STUB_LLM`) · **no** default Maestro for **coach + attached screenshot** (same `useImagePicker` as Home; `coach-chat-add-screenshot-button`) |
| **C6** | Generate reply from **screenshot** + Generate | Main value prop | ✅ partial | **`stub/02`** (Home **`image-picker-button`**) + `CHARMR_E2E_STUB_LLM` · **not** coach composer |
| **C6b** | Home **Add Screenshot** → **remove** image chip | Media strip regression | ✅ | **`28`** — Maestro build uses inject (`run-maestro-e2e.sh` temp env); no LLM |
| **C7** | Generate reply **image** limits / errors | Edge cases | ✅ partial | Hook: `useResponseGenerator` NO_IMAGES (no screenshot + blank prompt); Home UI hides **Generate** until images exist |
| **D1** | Feedback FAB → modal open | UX | ✅ | `05_support_feedback_exhaustive` |
| **D2** | User menu → Get help → modal (**open + X dismiss** without submit) | UX | ✅ | **`27_support_contact_open_close`** · full submit still **`05`** |
| **D3** | Contact + feedback **submit** (all fields) | Pipeline / API contract | ✅ | `05_support_feedback_exhaustive`: asserts + fills **`email-input`**, **`phone-input`** (optional), **`message-input`**; `eraseText` clears dev prefilled message; closes via success CTA or header close |
| **D4** | Support submit (registered email locked) + optional phone | Regression | ✅ | `17_support_registered_profile_submit` + dev **Simulate registered profile** (`phone-input` filled) |
| **D5** | `POST /api/support` accepts **phone** in JSON | Email template / CRM | ✅ | `npm run test:e2e:verify-api` payload includes `phone`; backend `SupportRequest.phone` |
| **E1** | Match **archive** from coach picker | Data loss confusion | ✅ | `07_coach_match_lifecycle` |
| **E2** | Match **restore** from Archived Matches (menu) | Stuck archived | ✅ | `07_coach_match_lifecycle` |
| **E3** | Match **edit** name + **edit** platform | CRUD | ✅ | **`07`** (rename) · **`25_coach_edit_match_platform`** (hinge → **tinder**; assert **Tinder** in picker) |
| **E4** | Match **delete** from archived list | Irreversible | ✅ | `08_archived_delete_scenarios` (cancel then confirm; second cold launch) |
| **E5** | Match list sort / `lastUsed` | UX | ✅ | `07_coach_match_lifecycle` (E2E Order A/B) · client sort `compareMatchesByLastUsedDesc` + `src/utils/__tests__/matchUtils.test.ts` |
| **L1** | Dev **Logout** → Login shell | Session reset | ✅ | `23_logout_dev_menu` (`dev-menu-logout-button`, __DEV__) |
| **F1** | Daily limit → **Upgrade** modal from coach send | Revenue | ✅ partial | `15_message_limit_shows_upgrade` + dev saturate API |
| **F2** | **RevenueCat** purchase completes | Revenue | 🔶 | Modal shell covered in **F1**; purchase stays manual / sandbox |
| **F3** | Subscription cancel / restore (where exposed) | Compliance | ✅ partial | `19_user_menu_legal_rows_visible` (Terms / Privacy rows); RC **Manage** / cancel stays manual |
| **G1** | Push notifications (permission + receipt) | Engagement | 🔶 | Manual / device |
| **G2** | iOS **keyboard extension** enable / usage | Core brand | 🔶 | **Manual:** Settings → Keyboards → add Charmr; extension XCTest TBD |
| **G3** | **Deep links** (auth, content) | Growth | ✅ partial | `18_deep_link_open_homescreen` (`charmr://open/homescreen`) · optional `optional/deep_link_open_screenshot_handoff.yaml` |
| **G4** | **Dev menu** E2E helpers | Internal | ✅ | `20_dev_menu_e2e_helpers_visible` · `15` saturate · `17` simulate registered · `23` logout |
| **H1** | **Accessibility** labels on critical controls | App Store / a11y | ✅ partial | `22_header_accessibility_labels` · Header + `user-menu-close-button` |

**Legend:** ✅ automated in Maestro today · 🔶 not automated (manual, OAuth, OS, or deferred).

### 1.1 Journeys intentionally outside the default numbered suite

These are real product paths but **not** required to pass `npm run test:e2e` today — either OS/store controlled, destructive, or flaky without dedicated harness:

| Area | Why |
|------|-----|
| OAuth **completion** (A3–A5) | System Safari / ASWebAuthenticationSession; use **optional** handoff YAMLs. |
| **RevenueCat** purchase / message-pack paywalls | StoreKit sandbox; **Upgrade Plan** from menu may open RC UI instead of `upgrade-modal` when offerings exist. |
| **Terms / Privacy** taps | `Linking.openURL` → Safari ( **`19`** only scrolls/asserts rows). |
| **Delete account** confirm (Firebase **isAuthenticated**) | Destructive; modal has **`delete-account-cancel-button`** / **`delete-account-confirm-button`** for future authenticated / manual Maestro. **L1** uses dev logout only. |
| **Push**, **keyboard extension** | Device / Settings; see matrix 🔶. |
| **Try Again** (generate timeout) | **`try-again-close-button`** exists for future harness; no stable way to force timeout in E2E without a dev flag. |
| **Onboarding** “Go to Settings” / help GIF modal | Leaves app; manual. |
| **Real Photos picker** | **`.env.e2e`** defaults to **`RELAX=false`** (rebuild). **`npm run test:e2e`** overrides to inject **only for that Xcode build** (temp env). **Optional** Maestro: **`npm run test:e2e:native-picker`**. |
| **Coach chat + screenshot** | Same native picker as Home; **not** in default Maestro; test manually or add a future flow (fragile). |

---

## 2. Full journey outlines (reference — not all automated)

Use this section to ensure **nothing is “missing from the doc”** even when still manual.

### J-A — Anonymous first run

1. Install app → cold launch → **Get Started** / **Log In** visible.  
2. **Get Started** → onboarding step 1 (keyboard instructions).  
3. **Skip** *or* **Next** through steps → **Skip** on register step.  
4. Backend creates/fetches anonymous user → **Home** (“Try Our Dating Coach”).  
5. Optional: **Dating Coach** → match list → add match → coach chat.  
6. Optional: **Feedback** FAB or **Get help** from menu.  
7. Optional: **Create account** in the account menu → login modal (**B6** / flow **`26`**).  
8. Optional: **Add Screenshot** then clear it (**C6b** / flow **`28`** when E2E image inject is on).

### J-B — Logged-in (Firebase) user

1. **Log In** → provider (Google / Apple / Facebook) → system UI → return to app.  
2. Home reflects registered profile (menu, limits, optional paywall).  
3. Generate reply / coach / matches under registered `userId`.

### J-C — Coach + matches

1. Open coach → **Your matches**.  
2. **Add a match** → name + platform → **Add match**.  
3. **Edit** (pencil) → change name and/or platform → **Update Match** (**`07`** + **`25`**).  
4. **Select** row → coach chat (free banner, composer).  
5. **Archive** from row → confirm → row leaves active list.  
6. **Menu** → **Archived Matches** → **Restore** → row back in coach list (or **Delete** → **Cancel** to keep the row).

### J-D — Monetization

1. Hit daily limit → upgrade modal / paywall.  
2. RevenueCat sandbox purchase → entitlement reflected.  
3. Cancel / manage subscription (platform-specific).

### J-E — Support & feedback

1. Open feedback or support modal → validate **email** (required), **phone** (optional), **message** (required).  
2. **Send Message** → success copy → dismiss.  
3. Or open **Get help** and dismiss with **X** without submitting (**`27`**).  
4. Backend ticket/email pipeline (verify in staging logs or test inbox); optional phone appears in support email body when provided.

### J-F — Keyboard extension (manual-heavy)

1. Follow onboarding links to Settings → Keyboards → add Charmr.  
2. Switch keyboard in host app; exercise extension UI (not fully drivable from Maestro host-only).

---

## 3. Maestro assets

### Numbered flows (executed by `npm run test:e2e`)

**23** flows today (merged journeys for speed; see matrix above for capability IDs).

| File | Maps to | Intent |
|------|---------|--------|
| `01_login_cold_start.yaml` | A1 | Splash → **`get-started-button`**, **`login-button`**, visible **Log In** |
| `02_login_modal_providers.yaml` | A2 | **Log In** → provider `testID`s → cancel |
| `03_onboarding_skip_to_home.yaml` | B4 | Skip path → Home |
| `04_onboarding_step_through.yaml` | B1–B3 | Next through steps → Skip → Home |
| `05_support_feedback_exhaustive.yaml` | D1–D3, D5 | Feedback + Contact: assert **`email-input`**, **`phone-input`**, **`message-input`**; fill all; blur via `support-contact-title`; **Send** → close via success CTA if present, else header close |
| `07_coach_match_lifecycle.yaml` | C2–C5, E1–E3, E5 | One session: add match → **Select** → coach (`coach-chat-match-name`, composer) → **Edit** → **Archive** → **Restore** → recency **E2E Order A/B** |
| `24_coach_add_match_other_platform.yaml` | C3b | Seed match → **Add a match** → **Other** + **`platform-other-field`** → assert **`E2E Other App`** in list |
| `25_coach_edit_match_platform.yaml` | E3 | **Edit** seeded row → **tinder** chip → **Update** → assert **Tinder** visible in picker |
| `26_menu_register_opens_login.yaml` | B6 | Menu **`user-menu-register-account`** → OAuth `testID`s → **Cancel** → close menu → Home |
| `27_support_contact_open_close.yaml` | D2 | Menu → **Get help** → **`support-contact-modal`** → **`support-contact-close`** → menu closed → Home |
| `28_home_screenshot_add_remove.yaml` | C6b | **`image-picker-button`** → **`selected-image-0`** → **`remove-image-0`** → inject path (**`npm run test:e2e`** build) |
| `08_archived_delete_scenarios.yaml` | E4 | (1) Delete → **Cancel** row remains · (2) fresh user → Delete → **Confirm** → empty |
| `11_onboarding_register_opens_login.yaml` | B5 | Step 3 **Register** → login modal → cancel |
| `14_session_restore_home.yaml` | A6 | Skip → Home → `stopApp` → relaunch (`clearState: false`) → Home |
| `15_message_limit_shows_upgrade.yaml` | F1 / F2 (shell) | Dev **Saturate limit** → coach send → `upgrade-modal` |
| `17_support_registered_profile_submit.yaml` | D4, D5 | Dev **Simulate registered profile** → Support/feedback modal → locked email + **`phone-input`** + message → **Send** → close |
| `18_deep_link_open_homescreen.yaml` | G3 | `openLink` **`charmr://open/homescreen`** → Home |
| `19_user_menu_legal_rows_visible.yaml` | F3 (partial) | Legal rows · `user-menu-terms-of-service` / `user-menu-privacy-policy` |
| `20_dev_menu_e2e_helpers_visible.yaml` | G4 | Dev drawer: simulate + saturate `testID`s |
| `22_header_accessibility_labels.yaml` | H1 (spot) | Header a11y labels |
| `23_logout_dev_menu.yaml` | L1 | Dev menu → **`dev-menu-logout-button`** → Login / **Get Started** |

### Optional & handoff flows (not in `npm run test:e2e`)

Run with `maestro test -p ios .maestro/optional/<file>.yaml` when needed.

| File | Maps to | Intent |
|------|---------|--------|
| `optional/oauth_google_handoff.yaml` | A3 | Login modal → **Google** button visible → manual OAuth |
| `optional/oauth_apple_handoff.yaml` | A4 | → **Apple** button → manual |
| `optional/oauth_facebook_handoff.yaml` | A5 | → **Facebook** button → manual |
| `optional/deep_link_open_screenshot_handoff.yaml` | G3 | `charmr://open/screenshot` → picker (flaky / manual follow-up) |
| `optional/native_image_picker_home.yaml` | C6 / QA | **Native** Photos UI → first thumbnail tap → **`selected-image-0`** (build with **`.env.e2e.native-picker`**; run **`npm run test:e2e:native-picker`**) |

### Stub LLM flows (`npm run test:e2e:stub-llm`)

Requires API process with **`CHARMR_E2E_STUB_LLM=true`** (see `backend/.env.example`). **Do not** enable stub on the same process while running flow **`15`** (limit flow needs real 429 path).

**Typical loop (Simulator + Metro + app on `.env.e2e`):**

1. Stop any normal backend on **3001** (or use another `PORT` and a matching `API_BASE_URL` in a custom envfile + rebuild iOS).
2. **`npm run test:e2e:stub-api-server`** — foreground API with stub + `CHARMR_DEV_MOCK_EMAIL=1` + sqlite.
3. **`npm run test:e2e:verify-stub-api`** — optional; confirms `POST /api/generate-reply` returns **`[E2E_STUB]`** (no Simulator).
4. **`npm run test:e2e:stub-llm`** — Maestro `stub/*.yaml` (runner invokes **one flow per process** so Maestro resolves assets consistently; see `scripts/run-maestro-stub-llm.sh`).

**`.env.e2e`:** Default **`CHARMR_E2E_RELAX_IMAGE_PICKER=false`** (real picker). **`npm run test:e2e`** builds with a **generated** env that sets **`RELAX=true`** so **`stub/02`** and **`28`** inject `assets/logo.png`. **`npm run test:e2e:stub-llm`** does not rebuild — run **`npm run test:e2e`** once first (or install a build made with inject) before **`stub/02`**. Production must not ship **`RELAX=true`**.

| File | Maps to | Intent |
|------|---------|--------|
| `stub/01_coach_send_stub_reply.yaml` | C5 | Coach send → assert `[E2E_STUB]` reply |
| `stub/02_generate_reply_image_stub.yaml` | C6 | Bundled image (see `CHARMR_E2E_RELAX_IMAGE_PICKER`) → **Generate reply** → assert full stub copy **`[E2E_STUB] Deterministic coach reply`** in reply modal |

### Includes (not run alone)

| File | Role |
|------|------|
| `include/onboarding_anonymous_home.yaml` | `launchApp` + skip onboarding → Home |
| `include/reach_coach_match_list_with_one_match.yaml` | Anonymous Home + coach + add **Maestro E2E Match** + assert **`match-list-first-row`** (blur name via `add-match-modal-title` before platform; ~35s wait) |
| `include/reach_coach_match_list_with_one_match_from_home.yaml` | Same add-match path **without** cold launch (same `userId`) |

---

## 4. Maestro timeout policy

`extendedWaitUntil` values are **intentionally tight** so regressions and slow API/UI show up quickly. Current defaults:

| Situation | Timeout (ms) |
|-----------|----------------|
| Cold launch → **Get Started** | 25000 |
| Onboarding step text / modals / coach titles | 12000 |
| **Try Our Dating Coach** after skip (anonymous user API) | 35000 |
| Match row visible after add/restore (`match-list-first-row` + API + state) | 35000 |
| Coach chat composer (`coach-chat-message-input` after navigation) | 35000 |
| Archive confirmation dialog title | 10000 |
| Support/feedback submit → success (HTTP) | 25000 |
| Stub LLM coach / generate reply text visible | 25000 |
| Relaunch Home after `stopApp` | 25000 |

Bump locally only when a step is legitimately slower (e.g. CI machine). Prefer **stable `testID`s** (e.g. `match-list-first-row`) over plain **text** on rows: React Native Paper `List.Item` string titles are often invisible to Maestro’s text matcher unless wrapped in native `Text` children.

---

## 5. Commands

```bash
# Full pipeline (simulator, Metro if needed, run-ios, numbered Maestro flows)
npm run test:e2e

# Stub LLM flows (start API with CHARMR_E2E_STUB_LLM=true — see test:e2e:stub-api-server)
npm run test:e2e:stub-llm

# Backend: health + POST /api/support (no simulator)
npm run test:e2e:verify-api

# Backend: POST /api/generate-reply must return [E2E_STUB] (stub flag on API)
npm run test:e2e:verify-stub-api

# Foreground dev server: sqlite + CHARMR_E2E_STUB_LLM + mock email (for stub Maestro)
npm run test:e2e:stub-api-server

# Bash syntax check for E2E scripts (matches CI job e2e-scripts)
npm run test:e2e:scripts

# One numbered flow (starts Metro unless CHARMR_E2E_SKIP_METRO=1)
npm run test:e2e:flow -- 05_support_feedback_exhaustive

# Skip Xcode build when app already installed (runner still ensures Metro on 8081)
CHARMR_E2E_SKIP_BUILD=1 npm run test:e2e
```

### Manual testing: real iOS Photos picker (device or Simulator)

1. **Env files:** **`./.env.e2e`** uses **`CHARMR_E2E_RELAX_IMAGE_PICKER=false`** by default (real Photos). **`npm run test:e2e`** forces **`RELAX=true`** only for its Xcode build (temp file). For **manual** installs with a dedicated filename, use **`./.env.e2e.manual`** + **`npm run ios:e2e-manual`** (also **`RELAX=false`**).
2. **Rebuild required:** `react-native-config` bakes at **native compile** time. Changing env files means a **new Xcode install** (Metro hot reload is not enough).
3. **Install with manual env:**
   ```bash
   npm run ios:e2e-manual
   npm run ios:e2e-manual -- --device "Your iPhone Name"
   npm run ios:e2e-manual -- --simulator "iPhone 16 Pro Max"
   ```
   (`scripts/run-ios-manual-picker.sh` sets **`ENVFILE=.env.e2e.manual`**.)
4. **Screenshots album:** Take at least one screenshot first so **Screenshots** is non-empty (`useImagePicker` targets that album).
5. **Device + API on Mac:** Set **`API_BASE_URL`** in **`.env.e2e.manual`** to your Mac’s LAN IP (e.g. `http://192.168.1.42:3001`); **`127.0.0.1`** on the phone is the phone itself, not your computer.
6. **`test:e2e:stub-llm`:** Does **not** run `run-ios`; **`stub/02`** needs an app binary built with **`RELAX=true`** (e.g. run **`npm run test:e2e`** once without **`CHARMR_E2E_SKIP_BUILD=1`**, or reuse that install).

### Troubleshooting (coach / match flows)

If the **match row** never satisfies **`match-list-first-row`** after **Add Match** but **`npm run test:e2e:verify-api`** passes, check in order:

1. **API URL in the native build** — Rebuild with **`ENVFILE=.env.e2e`** (see `scripts/run-maestro-e2e.sh`; **`.env.e2e`** sets `API_BASE_URL=http://127.0.0.1:3001`). Metro alone does not change `react-native-config` values baked into iOS.
2. **Coach screen store** — `CoachChatScreen` must **`setMatches`** after `addMatch` (and `loadMatches` in `finally`) so the picker list updates; Home (`ResponseGenerator`) already did; both paths should stay aligned.
3. **Maestro vs Paper list titles** — Flows assert **`match-list-first-row`** / native **`Text`** titles, not only free-text `visible: 'Some Name'`, because Paper list rows may omit string titles from the iOS accessibility tree.
4. **Restore / archived path** — After **Archived Matches** → **Close**, the **user menu slideout** can still be open; tap **`user-menu-close-button`** before **`dating-coach-button`** (see flow `07`).
5. **Open coach from Home** — `ResponseGenerator` uses **`navigation.push('CoachChat', {match})`** so each pick gets a fresh coach mount (avoids stuck loading / composer after re-select).

Quick API check: `POST /api/users` + `POST /api/users/:id/matches` with **`X-Anonymous-User`**.

---

## 6. Backlog (priority sketch — update as you ship)

1. **A3–A5** — Unattended OAuth completion (sandbox accounts, CI secrets); **handoff** YAMLs exist under `.maestro/optional/`.  
2. **C7** — Image-only / quota API errors in UI (beyond hook NO_IMAGES).  
3. **F2** — RevenueCat **purchase** to completion in sandbox (tagged job).  
4. ~~**D4** — Support registered email.~~ → `17`.  
5. ~~**C3b** — Other platform + custom text.~~ → `24`.  
6. ~~**E3** platform edit (picker).~~ → `25`.  
7. ~~**B6** menu Register → login modal.~~ → `26`.  
8. **G2** — Keyboard **extension** XCTest target (no extension in repo yet).  
9. ~~**G3** homescreen deep link.~~ → `18`; screenshot link → `optional/deep_link_open_screenshot_handoff.yaml`.  
10. **CI** — `.github/workflows/ci.yml` job **`e2e-scripts`** validates Maestro/E2E shell scripts with **`bash -n`**. Optional: extend `.github/workflows/e2e-ios.yml` (manual) with Simulator boot, `run-ios`, and API for full Maestro on macOS.  
11. ~~**D2** Contact open/dismiss (no submit).~~ → `27`.  
12. ~~**C6b** Home screenshot add/remove strip.~~ → `28`.

---

## 7. Implementation notes (for agents)

- **OAuth:** Never “complete” in default suite; **A2** + **B5** (`11`) + **B6** (`26`) check modal surfaces; see `.maestro/optional/README.md`.  
- **E2E API flags:** `CHARMR_E2E_STUB_LLM` short-circuits `POST /api/generate-reply` with `[E2E_STUB] Deterministic coach reply`. `CHARMR_E2E_FORCE_MESSAGE_LIMIT` forces 429 (avoid with stub).  
- **E2E image:** **`./.env.e2e`** — default **`RELAX=false`** (real picker). **`run-maestro-e2e.sh`** builds with **`RELAX=true`** (temp env) so **`stub/02`** / **`28`** inject **`assets/logo.png`**. **`./.env.e2e.manual`** + **`npm run ios:e2e-manual`** — same idea, explicit file. **`remove-image-0`** clears **`selected-image-0`**.
- **Native picker Maestro:** **`./.env.e2e.native-picker`** sets **`CHARMR_E2E_NATIVE_PICKER_TEST=true`** → picker uses **Recently Added** only (so **`simctl addmedia`** + single-album patch opens the grid). **`npm run test:e2e:native-picker`** (optional; not **`npm run test:e2e`**).
- **iOS Screenshots picker:** `useImagePicker` passes **`smartAlbums: ['Screenshots']` only**; **`patches/react-native-image-crop-picker+0.42.0.patch`** skips the one-row album list and opens the **Screenshots grid** immediately (not when Photo Library access is **Limited** — user still sees the manage row first).
- **Coach chat images:** **`coach-chat-add-screenshot-button`** opens the same picker path as Home; no **`stub/02`**-style flow targets coach.  
- **Dev-only:** `POST /api/dev/e2e/saturate-message-limit` (requires `NODE_ENV=development`) — used by **F1** flow `15`. Dev **E2E: Simulate registered profile** seeds `user.email` for **D4** / flow `17` (still uses anonymous API headers).  
- **Support API:** Mobile posts `userId`, `email`, optional **`phone`**, `message`, plan fields; backend `createSupportTicket` maps missing `subject` from `email`. Anonymous auth uses **`X-Anonymous-User`** when there is no Firebase ID token (`src/services/api.ts` + axios interceptor).  
- **Coach free banner:** `coach-free-upgrade-banner` shows when `user` is null or plan is FREE (`CoachChatScreen`).  
- **Match rows:** First active row `match-list-first-row` (others `match-list-item-<id>`); row **Select** `match-row-select-button` (prefer over `text: Select`). Edit `match-edit-button`, archive `match-archive-button` (use `index: 0` when one row); submit add `add-button`, edit save `update-match-button`; blur edit name via `add-match-modal-title` before **Update**. **Add match platforms:** `platform-hinge-button` / `platform-tinder-button` / `platform-bumble-button` / **`platform-other-button`**; when **Other** is selected, fill **`platform-other-field`** and blur via `add-match-modal-title` before **Add Match** (flow **`24`**). Selector close `match-selector-close`. Archived list first row `archived-match-first-row`.  
- **Archived modal:** Delete trash `hidden-match-delete-button`; dialog **Cancel** `archived-delete-cancel-button`.  
- **Coach input:** Composer `coach-chat-message-input`; send `coach-chat-send-button`.  
- **Generate:** `image-picker-button`, `generate-response-button`, reply `reply-modal-text` / `reply-modal-done`. Generate timeout UI: **`try-again-close-button`** (`TryAgainModal`).  
- **Upgrade:** `upgrade-modal`, close `upgrade-modal-close`.  
- **Deep links:** `charmr://open/homescreen`, `charmr://open/screenshot` (`DeepLinkHandler.tsx`).  
- **Account menu:** close `user-menu-close-button`. Anonymous **Create account** row: **`user-menu-register-account`**.
- **Coach header:** `coach-chat-match-name` mirrors the active match name in navigation.
- **Support success copy:** `support-submit-success-text` (child of `support-submit-success`).
- **Reply modal body:** `reply-modal-text` uses **React Native `Text`** (not Paper) so Maestro can read stub / reply strings on iOS.
- **Support modal dismiss:** **`support-contact-close`** (header X) when **not** submitted — flow **`27`**. After successful submit, prefer **`support-success-close-button`** over `support-contact-close` so touches are not swallowed by leftover modal layers.
- **Feedback + contact in one flow (`05`):** run **Get help from the menu first**, then **Feedback FAB**. Opening the menu after closing the feedback modal can fail to register taps on `user-menu-button` (focus / overlay); order avoids that.
- **Support / feedback form (`SupportContactModal`):** `email-input`, optional **`phone-input`**, `message-input`; order in Maestro **email → phone → message**; tap **`support-contact-title`** to blur before **Send**. In **__DEV__** the modal prefills message — numbered flows use **`eraseText`** on `message-input` before the scripted body so state is deterministic.
- **Paper TextInput + Maestro:** after `inputText` on support fields, blur via `support-contact-title` so **Send Message** enables (`disabled={!email \|\| !message}`).
- **Dev logout:** `dev-menu-logout-button` → `Login` route (**Get Started**).

Update **§1 matrix**, **§3 table**, and **§6** whenever you add flows or ship new surfaces.

---

## 8. Triage: Maestro reports “App crashed or stopped”

Maestro uses that message when the app process dies or stops responding during a step—not only for a native segfault.

1. **Maestro / Java** — If the CLI fails with **`JAVA_HOME is set to an invalid directory`**, unset **`JAVA_HOME`** (the per-flow script **`run-maestro-one.sh`** does this when **`JAVA_HOME`** is invalid) or run **`env -u JAVA_HOME npm run test:e2e:flow -- 01_login_cold_start`**.

2. **Confirm the app runs outside Maestro** — Boot the same simulator, launch **Charmr** manually, and reach **Get Started**. If it crashes on cold start, fix that first (Xcode **Run** with breakpoints / exception breakpoint).

3. **Simulator logs** — While reproducing, stream logs (replace `BOOTED` with your UDID if needed):  
   `xcrun simctl spawn booted log stream --level debug --predicate 'process == "Charmr"'`  
   Look for **Firebase**, **RevenueCat**, **Hermes**, or **RCTFatal** lines right before exit.

4. **Metro + Debug** — **`run-ios --no-packager`** loads JS from **http://127.0.0.1:8081**. Ensure **`curl -sf http://127.0.0.1:8081/status`** succeeds. Stale packager state: stop Metro, then **`npx react-native start --reset-cache`**, reinstall with **`npm run test:e2e`** (or your usual **`ENVFILE=.env.e2e`** build).

5. **`react-native-config` / E2E env** — The **Xcode** build for E2E uses a **temp** `.env` (from **`.env.e2e`** + injected **`CHARMR_E2E_RELAX_IMAGE_PICKER=true`**). JS reads most keys from the **native** config module built into that binary; Metro does not need to match for those. If you changed native deps or env wiring, do a **clean** build.

6. **Native crash reports** — Host reports live under **`~/Library/Logs/DiagnosticReports/`** (often **`.ips`**). Simulator-only crashes may appear in **Console.app** (select the simulator device) or under **`~/Library/Logs/CoreSimulator/`** for that runtime.

7. **Backend** — Many flows only need the app UI; some need **`API_BASE_URL`** reachable from the simulator (**`127.0.0.1`** in **`.env.e2e`**). A missing API usually causes **red screens or hangs**, not an immediate native crash—still worth having **`npm run dev -w charmr-backend`** (or stub server) running when debugging flaky flows.

8. **`kAXErrorAPIDisabled` / false “App crashed”** — If **`~/.maestro/tests/…/maestro.log`** shows **`Error getting main window kAXErrorAPIDisabled`**, XCTest queried the hierarchy before the window was ready (or the session glitched). After **`launchApp` + `clearState`**, flows run **`include/after_cold_launch.yaml`** (short JS wait); **`run-maestro-*.sh`** also activates **Simulator** before Maestro. Flows use **`waitForAnimationToEnd`** and **`id: get-started-button`** (RN **`testID`**) instead of matching the literal **“Get Started”** string. **Quit Simulator** and retry if it persists; avoid running two Maestro sessions on the same sim.
