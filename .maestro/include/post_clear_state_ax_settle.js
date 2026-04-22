// After simctl reinstall (clearState), XCTest can hit kAXErrorAPIDisabled briefly.
const ms = 12000;
const start = Date.now();
while (Date.now() - start < ms) {
  /* busy-wait */
}
output.settledMs = Date.now() - start;
