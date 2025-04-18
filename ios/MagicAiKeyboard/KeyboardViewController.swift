import KeyboardKit
import SwiftUI

class KeyboardViewController: KeyboardInputViewController {

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
                            controller.textDocumentProxy.insertText("You're cute, what's your story?")
                        }
                        .padding(8)
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(8)

                        Button("Paste AI Message ❤️") {
                            controller.textDocumentProxy.insertText("Let's get to know each other better!")
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