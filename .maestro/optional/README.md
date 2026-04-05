# Optional Maestro flows (not in `npm run test:e2e`)

Numbered flows live in `../[0-9][0-9]_*.yaml` and are picked up by `scripts/run-maestro-e2e.sh`. Everything in **this folder** is **opt-in**.

## OAuth completion (A3–A5)

Apple / Google / Facebook cannot be completed reliably in unattended CI: the OS shows WebView or `ASAuthorizationController`.

**Handoff flows** (tap **Log In**, assert provider button, then finish manually):

- `oauth_google_handoff.yaml`
- `oauth_apple_handoff.yaml`
- `oauth_facebook_handoff.yaml`

```bash
maestro test -p ios .maestro/optional/oauth_google_handoff.yaml
```

## Deep link — screenshot (flaky)

`deep_link_open_screenshot_handoff.yaml` fires `charmr://open/screenshot` after Home; the simulator may show permissions or the photo picker. Use for manual validation of `DeepLinkHandler`, not default CI.

## Homescreen deep link

Covered in the **default** suite by **`18_deep_link_open_homescreen.yaml`** (`charmr://open/homescreen`).

## Native Photos picker (opt-in)

**`native_image_picker_home.yaml`** taps **Add Screenshot**, selects the first asset in the **system** picker (no `CHARMR_E2E_RELAX_IMAGE_PICKER` inject). Requires a build with **`ENVFILE=.env.e2e.native-picker`** (`CHARMR_E2E_NATIVE_PICKER_TEST=true` uses **Recently Added** + `simctl addmedia` seed).

```bash
npm run test:e2e:native-picker
```

Uses **`simctl privacy … grant photos`** and **`simctl addmedia`** on the booted simulator; then **`scripts/run-maestro-native-picker.sh`** builds (unless `CHARMR_E2E_SKIP_BUILD=1`) and runs Maestro. Fragile: tap uses **percentage coordinates** for the first thumbnail. Not part of **`npm run test:e2e`**.
