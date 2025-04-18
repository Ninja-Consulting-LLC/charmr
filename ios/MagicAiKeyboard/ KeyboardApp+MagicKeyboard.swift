import KeyboardKit

extension KeyboardApp {
    static var magicKeyboard: KeyboardApp {
        .init(
            name: "Magic Keyboard",
            licenseKey: nil,      // Optional unless using KeyboardKit Pro
            appGroupId: nil,      // Set later if using App Groups
            locales: [.english]
        )
    }
}
