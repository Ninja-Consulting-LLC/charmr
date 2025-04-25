import KeyboardKit
import SwiftUI
import UIKit

struct Openers: Codable {
    let flirty: [String]
    let casual: [String]
    let cute: [String]
    let sincere: [String]
}

private var loadedOpeners: Openers?

func loadOpeners() {
    if loadedOpeners == nil {
        if let url = Bundle.main.url(forResource: "openers", withExtension: "json") {
            do {
                let data = try Data(contentsOf: url)
                loadedOpeners = try JSONDecoder().decode(Openers.self, from: data)
                print("✅ Loaded openers successfully")
            } catch {
                print("❌ Failed to load openers:", error)
            }
        }
    }
}

func getRandomOpener() -> String {
    guard let openers = loadedOpeners else {
        return "Hey there! 👋" // Fallback if openers not loaded
    }

    // Combine all categories and pick a random one
    let allOpeners = openers.flirty + openers.casual + openers.cute + openers.sincere
    return allOpeners.randomElement() ?? "Hey there! 👋"
}

class KeyboardViewController: KeyboardInputViewController {
    @Environment(\.openURL) private var openURL

    override func viewDidLoad() {
        super.viewDidLoad()

        // Load openers from JSON file
        loadOpeners()

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

            Button("Generate Opener") {
                let opener = getRandomOpener()
                print("Generated opener:", opener)
                controller.textDocumentProxy.insertText(opener)
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