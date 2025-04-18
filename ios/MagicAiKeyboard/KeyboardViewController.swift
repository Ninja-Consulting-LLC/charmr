import KeyboardKit
import SwiftUI
import UIKit

class KeyboardViewController: KeyboardInputViewController {
    @Environment(\.openURL) private var openURL

    override func viewDidLoad() {
        super.viewDidLoad()

        setup(for: .magicKeyboard) { result in
            switch result {
            case .success:
                print("✅ KeyboardKit setup succeeded")
            case .failure(let error):
                print("❌ KeyboardKit setup failed:", error)
            }
        }
    }

    override func viewWillSetupKeyboardView() {
        setupKeyboardView { (controller: KeyboardInputViewController) in
            KeyboardView(
                state: controller.state,
                services: controller.services,
                buttonContent: { $0.view },
                buttonView: { $0.view },
                collapsedView: { $0.view },
                emojiKeyboard: { $0.view },
                toolbar: { _ in
                    HStack {
                        Button("Dating Buddy 🤖") {
                            controller.advanceToNextInputMode()

                            if let url = URL(string: "aidatingkeyboard://open/gptmodal?source=keyboard") {
                                controller.openUrl(url)
                            }
                        }
                        .padding(8)
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(8)

                        Button("Paste AI Message ❤️") {
                            print("Attempting to paste from clipboard...")
                            if let clipboardText = UIPasteboard.general.string {
                                print("Found clipboard text:", clipboardText)
                                do {
                                    try controller.textDocumentProxy.insertText(clipboardText)
                                    print("Successfully inserted text")
                                } catch {
                                    print("Error inserting text:", error)
                                    controller.textDocumentProxy.insertText("Error pasting message. Please try again.")
                                }
                            } else {
                                print("Clipboard is empty")
                                controller.textDocumentProxy.insertText("No message in clipboard. Try copying a message first!")
                            }
                        }
                        .padding(8)
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(8)
                    }
                }
            )
        }
    }
}