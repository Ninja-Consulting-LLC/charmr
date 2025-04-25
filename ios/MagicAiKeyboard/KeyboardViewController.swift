import KeyboardKit
import SwiftUI
import UIKit

// Define the gradient colors from the theme
extension Color {
    static let primaryGradient = LinearGradient(
        gradient: Gradient(colors: [
            Color(red: 0.494, green: 0.133, blue: 0.808), // #7E22CE
            Color(red: 0.231, green: 0.027, blue: 0.392)  // #3B0764
        ]),
        startPoint: .leading,
        endPoint: .trailing
    )

    static let turquoise = Color(red: 0.251, green: 0.878, blue: 0.816) // #40E0D0
}

enum MessageStyle: String, CaseIterable {
    case spicy = "Spicy"
    case flirty = "Flirty"
    case casual = "Casual"
    case sincere = "Sincere"

    var emoji: String {
        switch self {
        case .spicy: return "🔥"
        case .flirty: return "😏"
        case .casual: return "😊"
        case .sincere: return "💝"
        }
    }

    var description: String {
        switch self {
        case .spicy: return "Frisky texts to turn up the heat"
        case .flirty: return "Rizz lines to spark interest"
        case .casual: return "Relaxed, simple conversation starters"
        case .sincere: return "Heartfelt messages from the soul"
        }
    }
}

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

func getRandomOpener(style: MessageStyle) -> String {
    guard let openers = loadedOpeners else {
        return "Hey there! 👋" // Fallback if openers not loaded
    }

    // Select openers based on style
    let selectedOpeners: [String]
    switch style {
    case .spicy, .flirty:
        selectedOpeners = openers.flirty
    case .casual:
        selectedOpeners = openers.casual
    case .sincere:
        selectedOpeners = openers.sincere
    }

    return selectedOpeners.randomElement() ?? "Hey there! 👋"
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

struct StylePickerView: View {
    let controller: KeyboardInputViewController
    @Binding var selectedStyle: MessageStyle
    @Binding var showingStylePicker: Bool

    var body: some View {
        VStack(spacing: 16) {
            Button(action: {
                showingStylePicker.toggle()
            }) {
                HStack {
                    Text(selectedStyle.emoji)
                    Text(selectedStyle.rawValue)
                        .foregroundColor(.white)
                    Text(selectedStyle.description)
                        .foregroundColor(.white.opacity(0.7))
                        .font(.system(size: 14))
                    Spacer()
                    Image(systemName: "chevron.down")
                        .foregroundColor(.white.opacity(0.7))
                }
                .padding()
                .frame(maxWidth: .infinity)
                .background(Color.primaryGradient)
                .cornerRadius(8)
            }
            .sheet(isPresented: $showingStylePicker) {
                VStack(spacing: 0) {
                    HStack {
                        Text("Choose Style")
                            .font(.headline)
                            .foregroundColor(.white)
                        Spacer()
                        Button(action: {
                            showingStylePicker = false
                        }) {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundColor(.white.opacity(0.7))
                        }
                    }
                    .padding()

                    ScrollView {
                        VStack(spacing: 0) {
                            ForEach(MessageStyle.allCases, id: \.self) { style in
                                Button(action: {
                                    selectedStyle = style
                                    showingStylePicker = false
                                }) {
                                    HStack {
                                        Text(style.emoji)
                                        VStack(alignment: .leading) {
                                            Text(style.rawValue)
                                                .foregroundColor(.white)
                                            Text(style.description)
                                                .foregroundColor(.white.opacity(0.7))
                                                .font(.system(size: 14))
                                        }
                                        Spacer()
                                        if style == selectedStyle {
                                            Image(systemName: "checkmark.circle.fill")
                                                .foregroundColor(.turquoise)
                                        }
                                    }
                                    .padding()
                                    .background(style == selectedStyle ? Color.white.opacity(0.1) : Color.clear)
                                    .cornerRadius(8)
                                }

                                if style != MessageStyle.allCases.last {
                                    Divider()
                                        .background(Color.white.opacity(0.2))
                                }
                            }
                        }
                        .padding(.horizontal)
                    }
                }
                .background(
                    Color.primaryGradient
                        .ignoresSafeArea()
                )
                .presentationDetents([.height(320)])
            }

            VStack(spacing: 2) {
                HStack(spacing: 4) {
                    Image(systemName: "sparkles")
                        .foregroundColor(.turquoise)
                    Text("Want personalized messages?")
                        .foregroundColor(.white)
                }
                Button(action: {
                    if let url = URL(string: "aidatingkeyboard://open/screenshot") {
                        controller.openUrl(url)
                    }
                }) {
                    Text("Take a screenshot & tap 'Open Charmr'")
                        .foregroundColor(.white.opacity(0.7))
                }
            }
            .font(.system(size: 13))
            .padding(.horizontal, 8)
            .padding(.vertical, 6)
            .background(Color.white.opacity(0.05))
            .cornerRadius(6)

            Spacer()
        }
        .padding()
    }
}

struct CustomToolbar: View {
    let controller: KeyboardInputViewController
    @Binding var isCustomKeyboard: Bool
    @Binding var selectedStyle: MessageStyle
    @Binding var showingStylePicker: Bool
    @Binding var hasGeneratedOpener: Bool

    var body: some View {
        HStack(spacing: 8) {
            Button("Open Charmr") {
                if let url = URL(string: "aidatingkeyboard://open/screenshot") {
                    print("Opening app with URL:", url.absoluteString)
                    controller.openUrl(url)
                }
            }
            .buttonStyle(OutlineButtonStyle())

            Button(hasGeneratedOpener ? "Regenerate" : "Generate Opener") {
                if hasGeneratedOpener {
                    // Regenerate: Clear existing text first
                    controller.textDocumentProxy.adjustTextPosition(byCharacterOffset: -Int.max)
                    controller.textDocumentProxy.adjustTextPosition(byCharacterOffset: Int.max)
                    let length = controller.textDocumentProxy.documentContextBeforeInput?.count ?? 0
                    for _ in 0..<length {
                        controller.textDocumentProxy.deleteBackward()
                    }
                }

                // Insert the new opener
                let opener = getRandomOpener(style: selectedStyle)
                controller.textDocumentProxy.insertText(opener)
                hasGeneratedOpener = true
            }
            .buttonStyle(OutlineButtonStyle())

            Spacer()

            Button(action: {
                isCustomKeyboard.toggle()
            }) {
                Image(systemName: "keyboard")
                    .font(.system(size: 20))
                    .foregroundColor(.turquoise)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }
}

struct OutlineButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            .foregroundColor(.turquoise)
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(Color.turquoise, lineWidth: 1)
            )
            .opacity(configuration.isPressed ? 0.7 : 1.0)
    }
}

struct CustomKeyboardView: View {
    let controller: KeyboardInputViewController
    @State private var isCustomKeyboard = false
    @State private var selectedStyle: MessageStyle = .flirty
    @State private var showingStylePicker = false
    @State private var hasGeneratedOpener = false

    var body: some View {
        VStack(spacing: 0) {
            // Common toolbar that appears in both modes
            CustomToolbar(
                controller: controller,
                isCustomKeyboard: $isCustomKeyboard,
                selectedStyle: $selectedStyle,
                showingStylePicker: $showingStylePicker,
                hasGeneratedOpener: $hasGeneratedOpener
            )
            .background(Color.primaryGradient)

            if isCustomKeyboard {
                // Custom keyboard with style selector
                StylePickerView(controller: controller, selectedStyle: $selectedStyle, showingStylePicker: $showingStylePicker)
                    .frame(height: 210)
                    .background(Color.primaryGradient)
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
                .frame(height: 210)
                .background(Color.primaryGradient)
            }
        }
    }
}