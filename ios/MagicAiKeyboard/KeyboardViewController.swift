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
        setupKeyboardView { controller in
            CustomKeyboardView(controller: controller)
        }
    }
}

struct CustomKeyboardView: View {
    let controller: KeyboardInputViewController
    @State private var isCustomKeyboard = false

    var body: some View {
        VStack(spacing: 0) {
            // Common toolbar that appears in both modes
            CustomToolbar(controller: controller, isCustomKeyboard: $isCustomKeyboard)

            if isCustomKeyboard {
                // Custom keyboard with smiley button
                VStack {
                    HStack {
                        Button("😊") {
                            controller.textDocumentProxy.insertText("😊")
                        }
                        .font(.system(size: 24))
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .background(Color.gray.opacity(0.2))
                        .cornerRadius(8)
                    }
                    .frame(height: 50)
                    .padding()

                    Spacer()
                }
            } else {
                // Default KeyboardKit keyboard
                KeyboardView(
                    state: controller.state,
                    services: controller.services,
                    buttonContent: { $0.view },
                    buttonView: { $0.view },
                    collapsedView: { $0.view },
                    emojiKeyboard: { $0.view },
                    toolbar: { _ in EmptyView() }
                )
            }
        }
    }
}

struct CustomToolbar: View {
    let controller: KeyboardInputViewController
    @Binding var isCustomKeyboard: Bool

    var body: some View {
        HStack {
            Button("Open Charmr") {
                if let url = URL(string: "aidatingkeyboard://open/homescreen") {
                    print("Opening app with URL:", url.absoluteString)
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
                    controller.textDocumentProxy.insertText(clipboardText)
                    print("Successfully inserted text")
                } else {
                    print("Clipboard is empty")
                    controller.textDocumentProxy.insertText("No message in clipboard. Try copying a message first!")
                }
            }
            .padding(8)
            .background(Color.blue)
            .foregroundColor(.white)
            .cornerRadius(8)

            Button(action: {
                isCustomKeyboard.toggle()
            }) {
                Image(systemName: "keyboard")
                    .foregroundColor(.white)
            }
            .padding(8)
            .background(Color.blue)
            .cornerRadius(8)
        }
        .padding(.horizontal, 4)
        .padding(.vertical, 8)
    }
}