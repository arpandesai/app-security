import type { Rule } from "../types";
import { G } from "./globs";

export const NETWORK_RULES: Rule[] = [
  {
    id: "MFS-NETWORK-01",
    category: "NETWORK",
    severity: "high",
    title: "Unencrypted HTTP connections",
    check: "Find plain http:// URLs the app connects to, and platform settings that allow cleartext traffic.",
    failIf:
      "The app talks to any production server over http://, or cleartext is allowed globally: Android usesCleartextTraffic=\"true\" or network_security_config cleartextTrafficPermitted=\"true\" outside debug; iOS NSAllowsArbitraryLoads / NSAllowsArbitraryLoadsInWebContent true or NSExceptionAllowsInsecureHTTPLoads for production domains.",
    passIf: "All production traffic is https; cleartext is limited to localhost/emulator in debug builds. Ignore XML namespaces (schemas.android.com, w3.org) and comments.",
    variants: [
      {
        target: "any",
        scope: "All app code",
        lookIn: [G.js, G.dart, G.kotlinJava, G.swiftObjc, G.env, G.expoConfig],
        searchFor: ["http://(?!localhost|127\\.0\\.0\\.1|10\\.0\\.2\\.2|schemas\\.|www\\.w3\\.org)"],
      },
      {
        target: "android",
        scope: "Android config",
        lookIn: [G.manifest, G.androidResXml],
        searchFor: ["usesCleartextTraffic=\"true\"", "cleartextTrafficPermitted=\"true\"", "networkSecurityConfig"],
      },
      {
        target: "expo",
        scope: "Expo config",
        lookIn: [G.expoConfig],
        searchFor: ["usesCleartextTraffic", "NSAllowsArbitraryLoads"],
      },
      {
        target: "ios",
        scope: "iOS config",
        lookIn: [G.plist],
        searchFor: ["NSAppTransportSecurity", "NSAllowsArbitraryLoads", "NSAllowsArbitraryLoadsInWebContent", "NSExceptionAllowsInsecureHTTPLoads"],
      },
    ],
    founder: "Anyone on the same Wi-Fi (café, airport, hotel) can read or change what the app sends, including logins.",
    fix: "Serve every API over HTTPS and remove cleartext exceptions from release configs.",
    refs: { masvs: ["MASVS-NETWORK-1"], maswe: ["MASWE-0026"], cwe: ["CWE-319"] },
  },
  {
    id: "MFS-NETWORK-02",
    category: "NETWORK",
    severity: "critical",
    title: "Certificate checks switched off",
    check: "Look for code or config that relaxes TLS certificate or hostname validation.",
    failIf:
      "Any code path accepts all certificates or hostnames (trust-all TrustManager, HostnameVerifier returning true, badCertificateCallback returning true, onReceivedSslError calling proceed(), rejectUnauthorized: false, URLSession challenge answered with the server trust unevaluated, Alamofire DisabledTrustEvaluator), or release builds trust user-installed certificates.",
    passIf: "Default platform validation is used everywhere (debug-only overrides inside debug configs are fine).",
    variants: [
      {
        target: "react-native",
        scope: "React Native (JS/TS)",
        lookIn: [G.js],
        searchFor: ["rejectUnauthorized:\\s*false", "trustAllCerts|disableAllSecurity", "NODE_TLS_REJECT_UNAUTHORIZED"],
      },
      {
        target: "flutter",
        scope: "Flutter (Dart)",
        lookIn: [G.dart],
        searchFor: ["badCertificateCallback", "onBadCertificate", "HttpOverrides\\.global"],
      },
      {
        target: "android",
        scope: "Android (Kotlin/Java + config)",
        lookIn: [G.kotlinJava, G.androidResXml],
        searchFor: ["X509TrustManager", "checkServerTrusted", "HostnameVerifier|ALLOW_ALL_HOSTNAME_VERIFIER|NoopHostnameVerifier", "onReceivedSslError", "handler\\.proceed\\(\\)", "<certificates src=\"user\""],
      },
      {
        target: "ios",
        scope: "iOS (Swift/ObjC)",
        lookIn: [G.swiftObjc],
        searchFor: ["didReceive challenge|didReceiveChallenge", "URLCredential\\(trust:", "allowInvalidCertificates|validatesDomainName", "DisabledTrustEvaluator|DisabledEvaluator"],
      },
    ],
    founder: "The app will talk to an impostor server. Someone on the network can silently read and change all traffic: logins, payments, everything.",
    fix: "Delete the override and rely on default certificate validation. For staging servers, use proper certificates or debug-only network configs.",
    refs: { masvs: ["MASVS-NETWORK-1"], maswe: ["MASWE-0027"], cwe: ["CWE-295"] },
  },
  {
    id: "MFS-NETWORK-03",
    category: "NETWORK",
    severity: "low",
    highValueOnly: true,
    title: "No certificate pinning for high-value traffic",
    check: "Check whether the app pins its own API's certificate or public key, and how pins are maintained.",
    failIf: "The app handles money, health or identity data and has no pinning for its own API, or pinning has a single pin with no backup.",
    passIf: "Pinning with backup pins (TrustKit, OkHttp CertificatePinner, network_security_config pin-set, NSPinnedDomains, react-native-ssl-public-key-pinning), or the app is not high-value.",
    variants: [
      {
        target: "any",
        scope: "All app code + config",
        lookIn: [G.js, G.dart, G.kotlinJava, G.swiftObjc, G.androidResXml, G.plist],
        searchFor: ["TrustKit|CertificatePinner|<pin-set|NSPinnedDomains", "ssl-pinning|ssl-public-key-pinning|http_certificate_pinning", "SecurityContext\\(withTrustedRoots"],
      },
    ],
    founder: "For a finance, health or identity app, an attacker with control of a network or a rogue certificate could intercept traffic.",
    fix: "Pin your API's public key with at least one backup pin, and plan pin rotation with your certificate renewals.",
    refs: { masvs: ["MASVS-NETWORK-2"], maswe: ["MASWE-0028"], cwe: ["CWE-295"] },
  },
];

export const PLATFORM_RULES: Rule[] = [
  {
    id: "MFS-PLATFORM-01",
    category: "PLATFORM",
    severity: "high",
    title: "Android components open to other apps",
    check:
      "Read the app's own AndroidManifest.xml (not library manifests) for exported components, and review PendingIntents and intents that carry data.",
    failIf:
      "An activity, service, broadcast receiver or content provider other than the launcher activity and intended deep-link entry points is exported without a signature-level permission and exposes data or actions; or a PendingIntent wraps an implicit intent with FLAG_MUTABLE; or sensitive data is sent through implicit intents or unprotected broadcasts; or data from incoming intents is used without validation.",
    passIf:
      "Only the launcher and deep-link activities are exported; everything else is exported=\"false\" or signature-protected; PendingIntents are FLAG_IMMUTABLE with explicit targets.",
    variants: [
      {
        target: "android",
        scope: "Android manifest",
        lookIn: [G.manifest],
        searchFor: ["android:exported=\"true\"", "<provider", "<receiver", "<service", "android:grantUriPermissions", "android:permission="],
      },
      {
        target: "android",
        scope: "Android (Kotlin/Java)",
        lookIn: [G.kotlinJava],
        searchFor: ["PendingIntent\\.get", "FLAG_MUTABLE", "sendBroadcast\\(", "getStringExtra|getParcelableExtra|getSerializableExtra"],
      },
    ],
    founder:
      "Other apps on the phone can reach into yours, trigger actions, read data or hijack messages it passes around, without the user knowing.",
    fix:
      "Set android:exported=\"false\" on everything that doesn't need outside access, protect the rest with signature permissions, use FLAG_IMMUTABLE with explicit intents, and validate incoming intent data.",
    refs: { masvs: ["MASVS-PLATFORM-1"], maswe: ["MASWE-0018", "MASWE-0032"], cwe: ["CWE-926", "CWE-927"] },
  },
  {
    id: "MFS-PLATFORM-02",
    category: "PLATFORM",
    severity: "high",
    title: "Deep links trigger actions without checks",
    check: "List the app's deep link/URL scheme handlers and what each route can do.",
    failIf:
      "A deep link can perform a sensitive action (payment, transfer, email/password change, login with a token in the link, open an arbitrary URL in a WebView, skip the login screen) without validating parameters and confirming with the user; or login callbacks/magic links use custom schemes where verified App Links/Universal Links should be used.",
    passIf: "Deep links only navigate; sensitive actions need confirmation and an authenticated session; https links are verified (autoVerify / associated domains).",
    variants: [
      {
        target: "react-native",
        scope: "React Native (JS/TS)",
        lookIn: [G.js],
        searchFor: ["Linking\\.(addEventListener|getInitialURL)", "linking=\\{|linking:", "expo-router|useLocalSearchParams|useURL\\("],
      },
      {
        target: "expo",
        scope: "Expo config",
        lookIn: [G.expoConfig],
        searchFor: ["\"scheme\"", "intentFilters", "associatedDomains"],
      },
      {
        target: "flutter",
        scope: "Flutter (Dart)",
        lookIn: [G.dart],
        searchFor: ["uni_links|app_links", "getInitialLink|uriLinkStream", "GoRoute\\(|onGenerateRoute"],
      },
      {
        target: "android",
        scope: "Android",
        lookIn: [G.manifest, G.kotlinJava],
        searchFor: ["<data android:scheme=", "android:autoVerify", "intent\\.data|getData\\(\\)", "getQueryParameter\\("],
      },
      {
        target: "ios",
        scope: "iOS",
        lookIn: [G.plist, G.swiftObjc, G.entitlements],
        searchFor: ["CFBundleURLSchemes", "open url|openURLContexts|onOpenURL", "NSUserActivity|continue userActivity", "applinks:"],
      },
    ],
    founder: "A link sent by text or email can make your app act on the user's behalf. Attackers can craft such links.",
    fix: "Treat deep link parameters as untrusted input, require confirmation plus an active session for sensitive actions, and use verified App Links / Universal Links.",
    refs: { masvs: ["MASVS-PLATFORM-1"], maswe: ["MASWE-0029"], cwe: ["CWE-939"] },
  },
  {
    id: "MFS-PLATFORM-03",
    category: "PLATFORM",
    severity: "high",
    title: "WebView exposes app functions to web content",
    check: "Find every WebView, what it loads, and what bridges or file access it enables.",
    failIf:
      "A WebView loading remote or user-influenced URLs has a JavaScript bridge that performs sensitive actions (onMessage handlers, addJavascriptInterface, WKScriptMessageHandler, JavaScript channels), file access enabled, originWhitelist ['*'] with a bridge, or loads URLs taken from deep links/push/API without an allowlist. Any UIWebView use is a fail.",
    passIf: "WebViews load only your own https content (allowlisted), bridges validate origin and expose nothing sensitive, file access is off. Not applicable if no WebView.",
    variants: [
      {
        target: "react-native",
        scope: "React Native (JS/TS)",
        lookIn: [G.js],
        searchFor: ["<WebView", "onMessage=", "injectedJavaScript|injectJavaScript", "originWhitelist=\\{\\[['\"]\\*", "allowFileAccess|allowUniversalAccessFromFileURLs|allowFileAccessFromFileURLs", "mixedContentMode=\"always\""],
      },
      {
        target: "flutter",
        scope: "Flutter (Dart)",
        lookIn: [G.dart],
        searchFor: ["WebViewController|WebViewWidget|InAppWebView", "JavaScriptMode\\.unrestricted", "addJavaScriptChannel|addJavaScriptHandler", "allowFileAccessFromFileURLs|allowUniversalAccessFromFileURLs"],
      },
      {
        target: "android",
        scope: "Android (Kotlin/Java)",
        lookIn: [G.kotlinJava],
        searchFor: ["addJavascriptInterface", "@JavascriptInterface", "setJavaScriptEnabled\\(true\\)|javaScriptEnabled = true", "setAllowFileAccess\\(true\\)|setAllowUniversalAccessFromFileURLs|setAllowFileAccessFromFileURLs", "loadUrl\\("],
      },
      {
        target: "ios",
        scope: "iOS (Swift/ObjC)",
        lookIn: [G.swiftObjc],
        searchFor: ["WKScriptMessageHandler", "userContentController\\.add|add\\(self, name:", "allowFileAccessFromFileURLs", "loadFileURL\\(|allowingReadAccessTo", "UIWebView"],
      },
    ],
    founder: "A web page shown inside your app can reach into the app's private functions and data.",
    fix: "Allowlist the domains each WebView may load, validate message origins, expose no sensitive bridge functions, and disable file access.",
    refs: { masvs: ["MASVS-PLATFORM-2"], maswe: ["MASWE-0033", "MASWE-0034", "MASWE-0035"], cwe: ["CWE-749"] },
  },
  {
    id: "MFS-PLATFORM-04",
    category: "PLATFORM",
    severity: "medium",
    title: "Sensitive data exposed on screen",
    check:
      "Review password/PIN/OTP/card inputs, clipboard writes, notification text, and screens that show highly sensitive data.",
    failIf:
      "Any of: password, PIN or CVV fields not masked or allowing keyboard learning (autocorrect/suggestions on); passwords, OTPs, tokens, recovery phrases or full card/bank numbers copied to the general clipboard without expiry or sensitive flags; OTPs, balances, account numbers, medical details or message contents shown in lock-screen notifications without private visibility; or, in an app handling money, health or identity data, screens with full card numbers, statements, medical records, ID documents or recovery phrases that can be screenshotted or appear in the app switcher.",
    passIf:
      "Sensitive fields are masked with suggestions off and autofill hints set; secrets aren't copied, or copies expire and are marked sensitive; notifications stay generic; high-value apps block capture on sensitive screens.",
    variants: [
      {
        target: "react-native",
        scope: "React Native (JS/TS)",
        lookIn: [G.js],
        searchFor: ["<TextInput", "secureTextEntry", "textContentType=|autoComplete="],
      },
      {
        target: "flutter",
        scope: "Flutter (Dart)",
        lookIn: [G.dart],
        searchFor: ["TextField\\(|TextFormField\\(", "obscureText", "enableSuggestions|autocorrect", "autofillHints"],
      },
      {
        target: "android",
        scope: "Android",
        lookIn: [G.kotlinJava, "**/src/main/res/layout/*.xml"],
        searchFor: ["inputType=\"textPassword|numberPassword", "PasswordVisualTransformation|KeyboardType\\.Password"],
      },
      {
        target: "ios",
        scope: "iOS",
        lookIn: [G.swiftObjc],
        searchFor: ["isSecureTextEntry|SecureField", "textContentType"],
      },
      {
        target: "any",
        scope: "All app code",
        lookIn: [G.js, G.dart, G.kotlinJava, G.swiftObjc],
        searchFor: ["FLAG_SECURE", "preventScreenCapture|usePreventScreenCapture", "screen_protector|no_screenshot|FlutterWindowManager", "isCaptured|capturedDidChangeNotification", "WillResignActive"],
      },
      {
        target: "any",
        scope: "All app code",
        lookIn: [G.js, G.dart, G.kotlinJava, G.swiftObjc],
        searchFor: ["Clipboard\\.(setString|setStringAsync|setData)", "setPrimaryClip|ClipboardManager", "UIPasteboard"],
      },
      {
        target: "any",
        scope: "All app code",
        lookIn: [G.js, G.dart, G.kotlinJava, G.swiftObjc],
        searchFor: ["scheduleNotificationAsync|localNotification|displayNotification", "flutter_local_notifications|\\.show\\(", "NotificationCompat\\.Builder|setVisibility", "UNMutableNotificationContent"],
      },
    ],
    founder:
      "Passwords, codes and private details show up where others can see or copy them: on screen, in the keyboard's memory, the clipboard, the lock screen or screenshots.",
    fix:
      "Mask sensitive fields and turn off suggestions on them, avoid copying secrets (or set expiry and sensitive flags), keep notifications generic, and block capture on sensitive screens in high-value apps.",
    refs: { masvs: ["MASVS-PLATFORM-3", "MASVS-PLATFORM-1"], maswe: ["MASWE-0036", "MASWE-0030", "MASWE-0037", "MASWE-0038"], cwe: ["CWE-549", "CWE-200"] },
  },
];
