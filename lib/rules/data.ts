import type { Rule } from "../types";
import { G } from "./globs";

export const STORAGE_RULES: Rule[] = [
  {
    id: "MFS-STORAGE-01",
    category: "STORAGE",
    severity: "high",
    title: "Login tokens or personal data stored unencrypted",
    check: "Trace where the app stores auth tokens, refresh tokens, passwords, PINs, session IDs and sensitive personal data on the device.",
    failIf:
      "Any of those values is written to an unencrypted store: AsyncStorage, unencrypted MMKV, redux-persist/zustand persist on AsyncStorage, SharedPreferences, Hive without a cipher, GetStorage, plain SQLite, UserDefaults, @AppStorage, plain files.",
    passIf:
      "Sensitive values use Keychain/Keystore-backed storage: expo-secure-store, react-native-keychain, react-native-encrypted-storage, flutter_secure_storage, iOS Keychain, Android Keystore-encrypted storage.",
    variants: [
      {
        target: "react-native",
        scope: "React Native (JS/TS)",
        lookIn: [G.js],
        searchFor: ["AsyncStorage\\.(setItem|multiSet)", "new MMKV\\(", "createMMKV\\(", "persistReducer|persist\\(", "localStorage\\.setItem"],
        hint: "MMKV without an encryptionKey is unencrypted. Check what redux/zustand persist stores (auth slices).",
      },
      {
        target: "flutter",
        scope: "Flutter (Dart)",
        lookIn: [G.dart],
        searchFor: ["SharedPreferences", "\\.setString\\(", "Hive\\.openBox", "encryptionCipher", "GetStorage", "openDatabase\\("],
      },
      {
        target: "android",
        scope: "Android (Kotlin/Java)",
        lookIn: [G.kotlinJava],
        searchFor: ["getSharedPreferences\\(", "\\.putString\\(", "openOrCreateDatabase", "dataStore|preferencesDataStore"],
      },
      {
        target: "ios",
        scope: "iOS (Swift/ObjC)",
        lookIn: [G.swiftObjc],
        searchFor: ["UserDefaults", "NSUserDefaults", "@AppStorage", "\\.write\\(to:", "NSPersistentContainer"],
      },
    ],
    founder:
      "Anyone with brief access to an unlocked or rooted phone, or to an unencrypted backup, can copy the user's login and walk into their account.",
    fix:
      "Store tokens and credentials with the platform's secure storage (expo-secure-store, react-native-keychain, flutter_secure_storage, Keychain, Android Keystore). Keep only non-sensitive preferences in plain storage.",
    refs: { masvs: ["MASVS-STORAGE-1"], maswe: ["MASWE-0001"], cwe: ["CWE-312", "CWE-922"] },
  },
  {
    id: "MFS-STORAGE-02",
    category: "STORAGE",
    severity: "high",
    title: "Sensitive files saved where other apps can read them",
    check: "Find files the app writes to shared/external storage, the photo library or user-visible document folders.",
    failIf:
      "Sensitive files (statements, IDs, medical documents, exports, tokens, chat backups) go to external/shared storage, Downloads, the photo library, world-readable modes, or iOS files with NSFileProtectionNone.",
    passIf: "Sensitive files stay in app-private storage with default file protection, or the user explicitly exports them.",
    variants: [
      {
        target: "react-native",
        scope: "React Native (JS/TS)",
        lookIn: [G.js],
        searchFor: ["ExternalDirectoryPath|ExternalStorageDirectoryPath|DownloadDirectoryPath", "CameraRoll\\.save", "MediaLibrary\\.saveToLibraryAsync"],
      },
      {
        target: "flutter",
        scope: "Flutter (Dart)",
        lookIn: [G.dart],
        searchFor: ["getExternalStorageDirectory|getDownloadsDirectory", "/sdcard|/storage/emulated", "ImageGallerySaver|gallery_saver"],
      },
      {
        target: "android",
        scope: "Android (Kotlin/Java)",
        lookIn: [G.kotlinJava, G.manifest],
        searchFor: ["getExternalStorageDirectory|getExternalStoragePublicDirectory|getExternalFilesDir", "MODE_WORLD_READABLE|MODE_WORLD_WRITEABLE", "MANAGE_EXTERNAL_STORAGE|WRITE_EXTERNAL_STORAGE"],
      },
      {
        target: "ios",
        scope: "iOS (Swift/ObjC)",
        lookIn: [G.swiftObjc, G.plist],
        searchFor: ["NSFileProtectionNone|\\.noFileProtection", "UIImageWriteToSavedPhotosAlbum|PHPhotoLibrary", "UIFileSharingEnabled|LSSupportsOpeningDocumentsInPlace"],
      },
    ],
    founder: "Private files land in folders that other apps on the phone, or anyone browsing its files, can open.",
    fix: "Keep sensitive files in app-private storage. Only export to shared locations when the user asks, and never store secrets there.",
    refs: { masvs: ["MASVS-STORAGE-1"], maswe: ["MASWE-0002"], cwe: ["CWE-922"] },
  },
  {
    id: "MFS-STORAGE-03",
    category: "STORAGE",
    severity: "medium",
    title: "Sensitive data printed to logs",
    check: "Review log statements that can run in release builds.",
    failIf:
      "Logs that run in release include tokens, passwords, OTPs, Authorization headers, full API responses containing personal data, or card/bank details.",
    passIf: "Logs are generic, or sensitive logging is wrapped in debug-only guards (__DEV__, kDebugMode, BuildConfig.DEBUG, #if DEBUG), or console calls are stripped in production builds.",
    variants: [
      {
        target: "react-native",
        scope: "React Native (JS/TS)",
        lookIn: [G.js, "babel.config.js"],
        searchFor: ["console\\.(log|info|debug|warn|error)\\(", "transform-remove-console"],
      },
      {
        target: "flutter",
        scope: "Flutter (Dart)",
        lookIn: [G.dart],
        searchFor: ["print\\(", "debugPrint\\(", "log\\(", "Logger\\("],
      },
      {
        target: "android",
        scope: "Android (Kotlin/Java)",
        lookIn: [G.kotlinJava],
        searchFor: ["Log\\.[vdiwe]\\(", "println\\(", "Timber\\."],
      },
      {
        target: "ios",
        scope: "iOS (Swift/ObjC)",
        lookIn: [G.swiftObjc],
        searchFor: ["print\\(", "NSLog\\(", "os_log\\(", "debugPrint\\("],
      },
    ],
    founder: "Logins and personal data end up in device logs and crash tools, where other people can read them.",
    fix: "Remove sensitive values from logs, guard debug logging behind build flags, and strip console output from release builds.",
    refs: { masvs: ["MASVS-STORAGE-2"], maswe: ["MASWE-0005"], cwe: ["CWE-532"] },
  },
  {
    id: "MFS-STORAGE-04",
    category: "STORAGE",
    severity: "medium",
    title: "Private app data copied into device backups",
    check: "Check backup configuration for Android and backup exclusion / Keychain accessibility for iOS.",
    failIf:
      "Android: allowBackup is true or unset (default true) with no backup/data-extraction rules excluding files, databases or shared_prefs that hold sensitive data. iOS: sensitive files not excluded from backup, or tokens stored in Keychain with a non-ThisDeviceOnly accessibility class.",
    passIf: "allowBackup=\"false\", or rules exclude sensitive data; iOS sensitive items use ThisDeviceOnly classes or backup exclusion.",
    variants: [
      {
        target: "android",
        scope: "Android config",
        lookIn: [G.manifest, G.androidResXml],
        searchFor: ["android:allowBackup", "android:fullBackupContent", "android:dataExtractionRules", "<exclude "],
      },
      {
        target: "expo",
        scope: "Expo config",
        lookIn: [G.expoConfig],
        searchFor: ["\"allowBackup\""],
        hint: "Expo apps default to allowBackup true unless set to false.",
      },
      {
        target: "ios",
        scope: "iOS (Swift/ObjC)",
        lookIn: [G.swiftObjc],
        searchFor: ["isExcludedFromBackup", "kSecAttrAccessibleAfterFirstUnlock\\b|kSecAttrAccessibleAlways\\b|kSecAttrAccessibleWhenUnlocked\\b"],
      },
    ],
    founder: "Users' private data from your app gets copied into cloud and computer backups, outside your control.",
    fix: "Set allowBackup=\"false\" or add backup rules excluding sensitive files; on iOS use ThisDeviceOnly Keychain classes and exclude sensitive files from backup.",
    refs: { masvs: ["MASVS-STORAGE-2"], maswe: ["MASWE-0006"], cwe: ["CWE-530"] },
  },
];

export const CRYPTO_RULES: Rule[] = [
  {
    id: "MFS-CRYPTO-01",
    category: "CRYPTO",
    severity: "high",
    title: "Encryption keys hardcoded in the code",
    check: "Find every place the app encrypts or decrypts data and where the key, IV/nonce and salt come from.",
    failIf:
      "An encryption key, IV/nonce, salt or encryption password is a literal in code or config (string or byte array), or derived from a constant (app name, bundle ID, device model). Includes MMKV encryptionKey and HiveAesCipher keys set to literals.",
    passIf: "Keys are generated at runtime and kept in Keychain/Keystore, or provided per user by the server over TLS. Not applicable if the app does no custom encryption.",
    variants: [
      {
        target: "any",
        scope: "All app code",
        lookIn: [G.js, G.dart, G.kotlinJava, G.swiftObjc],
        searchFor: ["CryptoJS\\.AES\\.(en|de)crypt", "SecretKeySpec\\(", "Key\\.fromUtf8\\(|IV\\.fromUtf8\\(|Key\\.fromBase64\\(", "encryptionKey\\s*:", "HiveAesCipher\\(", "SymmetricKey\\(data:", "CCCrypt\\(", "react-native-aes-crypto|aes-js"],
      },
    ],
    founder: "The lock and its key ship together. Anyone who opens the app file can decrypt everything this code is meant to protect.",
    fix: "Generate keys at runtime with a secure random source and store them in Keychain/Keystore (or fetch per-user keys from your server). Never commit keys or IVs.",
    refs: { masvs: ["MASVS-CRYPTO-2"], maswe: ["MASWE-0003"], cwe: ["CWE-321"] },
  },
  {
    id: "MFS-CRYPTO-02",
    category: "CRYPTO",
    severity: "medium",
    title: "Weak or broken encryption",
    check: "Identify the algorithms and modes used wherever the app encrypts data.",
    failIf:
      "DES, 3DES, RC4 or Blowfish; AES in ECB mode (including Java `Cipher.getInstance(\"AES\")`, which defaults to ECB); or home-made 'encryption' (XOR, Base64, ROT) used to protect sensitive data.",
    passIf: "AES-GCM, ChaCha20-Poly1305, or platform crypto (CryptoKit, Tink, Keystore). Not applicable if the app does no custom encryption.",
    variants: [
      {
        target: "any",
        scope: "All app code",
        lookIn: [G.js, G.dart, G.kotlinJava, G.swiftObjc],
        searchFor: ["CryptoJS\\.(DES|TripleDES|RC4)", "mode\\.ECB|AESMode\\.ecb|/ECB/", "Cipher\\.getInstance\\(\"(AES|DES|DESede|RC4|Blowfish)\"\\)", "kCCAlgorithm(DES|3DES|RC4)|kCCOptionECBMode", "createCipher\\("],
      },
    ],
    founder: "The encryption used is outdated and can be broken, so the data it protects isn't really protected.",
    fix: "Switch to AES-GCM or ChaCha20-Poly1305 through a vetted library or platform API, with a random nonce per message.",
    refs: { masvs: ["MASVS-CRYPTO-1"], maswe: ["MASWE-0007"], cwe: ["CWE-327"] },
  },
  {
    id: "MFS-CRYPTO-03",
    category: "CRYPTO",
    severity: "medium",
    title: "Weak hashing for passwords or integrity checks",
    check: "Find hashing calls and decide what each one protects.",
    failIf:
      "MD5 or SHA-1 used for passwords, PINs, tokens, signatures or integrity checks, or a fast hash (plain SHA-256) used to store passwords/PINs on the device without a slow key-derivation function.",
    passIf: "Security uses SHA-256+ for integrity and a slow KDF (Argon2, scrypt, PBKDF2 with high iterations) for passwords. Non-security uses of MD5 (cache keys, checksums of public files) are fine.",
    variants: [
      {
        target: "any",
        scope: "All app code",
        lookIn: [G.js, G.dart, G.kotlinJava, G.swiftObjc],
        searchFor: ["md5|MD5", "sha1|SHA1|SHA-1", "Insecure\\.(MD5|SHA1)", "CC_MD5|CC_SHA1", "MessageDigest\\.getInstance\\(\"(MD5|SHA-1)\"", "createHash\\(['\"](md5|sha1)"],
      },
    ],
    founder: "Passwords or checks rely on hashing that attackers can reverse or fake with free tools.",
    fix: "Use SHA-256 or better for integrity, and Argon2/scrypt/PBKDF2 for anything password-like. Better still, keep password handling on the server.",
    refs: { masvs: ["MASVS-CRYPTO-1"], maswe: ["MASWE-0008"], cwe: ["CWE-328"] },
  },
  {
    id: "MFS-CRYPTO-04",
    category: "CRYPTO",
    severity: "medium",
    title: "Predictable random values used for security",
    check: "Find random number generation and what the values are used for.",
    failIf: "A non-cryptographic generator (Math.random, Dart Random(), java.util.Random, kotlin.random.Random, rand()/random()) creates tokens, OTPs, passwords, nonces, IVs, keys, session IDs or invite codes.",
    passIf: "Security values use crypto.getRandomValues / expo-crypto / Random.secure() / SecureRandom / SecRandomCopyBytes, or random values are only used for UI and non-security logic.",
    variants: [
      {
        target: "react-native",
        scope: "React Native (JS/TS)",
        lookIn: [G.js],
        searchFor: ["Math\\.random\\("],
      },
      {
        target: "flutter",
        scope: "Flutter (Dart)",
        lookIn: [G.dart],
        searchFor: ["Random\\(\\)", "Random\\(\\d+\\)"],
        hint: "Random.secure() is fine.",
      },
      {
        target: "android",
        scope: "Android (Kotlin/Java)",
        lookIn: [G.kotlinJava],
        searchFor: ["java\\.util\\.Random", "kotlin\\.random\\.Random", "Random\\("],
      },
      {
        target: "ios",
        scope: "iOS (Swift/ObjC)",
        lookIn: [G.swiftObjc],
        searchFor: ["\\brand\\(\\)|\\brandom\\(\\)|srand|drand48"],
      },
    ],
    founder: "Codes or tokens that should be unguessable can be predicted by an attacker.",
    fix: "Use the platform's cryptographically secure random generator for every security-related value.",
    refs: { masvs: ["MASVS-CRYPTO-1"], maswe: ["MASWE-0012"], cwe: ["CWE-338"] },
  },
];

export const AUTH_RULES: Rule[] = [
  {
    id: "MFS-AUTH-01",
    category: "AUTH",
    severity: "high",
    title: "Biometric lock can be bypassed",
    check: "Find biometric (Face ID / fingerprint) or device-PIN prompts and what a successful prompt unlocks.",
    failIf:
      "Success is only a true/false in app code that then reveals data or a token already readable from storage (event-bound), instead of unlocking a Keychain/Keystore key that requires user authentication.",
    passIf:
      "Biometrics unlock a key bound to authentication (Android BiometricPrompt with CryptoObject + setUserAuthenticationRequired; iOS SecAccessControl with .biometryCurrentSet). Not applicable if no biometric/PIN lock exists.",
    variants: [
      {
        target: "react-native",
        scope: "React Native (JS/TS)",
        lookIn: [G.js],
        searchFor: ["simplePrompt\\(", "authenticateAsync\\(", "react-native-touch-id|react-native-fingerprint-scanner", "accessControl:|ACCESS_CONTROL"],
        hint: "react-native-keychain with accessControl BIOMETRY_* is the bound pattern.",
      },
      {
        target: "flutter",
        scope: "Flutter (Dart)",
        lookIn: [G.dart],
        searchFor: ["local_auth", "\\.authenticate\\(", "biometric_storage"],
      },
      {
        target: "android",
        scope: "Android (Kotlin/Java)",
        lookIn: [G.kotlinJava],
        searchFor: ["BiometricPrompt", "\\.authenticate\\(", "CryptoObject", "setUserAuthenticationRequired"],
      },
      {
        target: "ios",
        scope: "iOS (Swift/ObjC)",
        lookIn: [G.swiftObjc],
        searchFor: ["LAContext", "evaluatePolicy\\(", "SecAccessControlCreateWithFlags", "biometryCurrentSet"],
      },
    ],
    founder: "The Face ID or fingerprint screen is a door with no lock behind it. A tampered app skips it and gets straight in.",
    fix: "Bind biometric success to a Keychain/Keystore key that requires user authentication, and decrypt the session only with that key.",
    refs: { masvs: ["MASVS-AUTH-2"], maswe: ["MASWE-0020"], cwe: ["CWE-287"] },
  },
  {
    id: "MFS-AUTH-02",
    category: "AUTH",
    severity: "high",
    title: "Insecure login flow or OAuth secret in the app",
    check: "Review how users sign in, including social/OAuth logins.",
    failIf:
      "An OAuth client_secret is embedded in the app; the implicit flow (response_type=token) or password grant is used; PKCE is disabled; or Google/Apple/Microsoft login runs inside an embedded WebView.",
    passIf: "Authorization Code + PKCE through the system browser (AppAuth, expo-auth-session, ASWebAuthenticationSession, Custom Tabs) or official provider SDKs.",
    variants: [
      {
        target: "any",
        scope: "All app code",
        lookIn: [G.js, G.dart, G.kotlinJava, G.swiftObjc, G.configFiles],
        searchFor: ["client_secret|clientSecret", "response_type=token", "grant_type=password", "usePKCE:\\s*false", "accounts\\.google\\.com|login\\.microsoftonline\\.com|appleid\\.apple\\.com"],
        hint: "A provider login URL loaded inside a WebView is a fail.",
      },
    ],
    founder: "The way users log in can be intercepted or abused, and the secret your login provider gave you is inside the app.",
    fix: "Use Authorization Code with PKCE through the system browser or the provider's SDK, and remove client secrets from the app (rotate them).",
    refs: { masvs: ["MASVS-AUTH-1"], maswe: ["MASWE-0004"], cwe: ["CWE-287", "CWE-798"] },
  },
  {
    id: "MFS-AUTH-03",
    category: "AUTH",
    severity: "medium",
    title: "Logout leaves the session alive",
    check: "Follow the logout/sign-out code path.",
    failIf: "Logout only navigates away or clears UI state, but leaves stored tokens on the device, or never revokes the session/refresh token with the backend or auth provider.",
    passIf: "Logout deletes stored tokens from every store and calls the provider's signOut/revoke.",
    variants: [
      {
        target: "any",
        scope: "All app code",
        lookIn: [G.js, G.dart, G.kotlinJava, G.swiftObjc],
        searchFor: ["logout|logOut|signOut|sign_out", "removeItem|deleteItemAsync|delete\\(key|resetGenericPassword|SecItemDelete", "revoke"],
      },
    ],
    founder: "After a user logs out, their account can still be reached from the phone.",
    fix: "On logout, delete tokens from every storage location and revoke the session on the server.",
    refs: { masvs: ["MASVS-AUTH-3"], maswe: ["MASWE-0024"], cwe: ["CWE-613"] },
  },
  {
    id: "MFS-AUTH-04",
    category: "AUTH",
    severity: "low",
    title: "No re-check before sensitive account changes",
    check: "Find flows that change email, password, phone, payout/bank details, delete the account, or move money.",
    failIf: "These actions run with just the existing session, without re-entering a password, biometric, or OTP.",
    passIf: "Sensitive actions require fresh authentication. Not applicable if the app has no such actions.",
    variants: [
      {
        target: "any",
        scope: "All app code",
        lookIn: [G.js, G.dart, G.kotlinJava, G.swiftObjc],
        searchFor: ["changePassword|updatePassword|updateEmail|changeEmail", "deleteAccount|delete_account", "payout|withdraw|transfer|bankAccount", "reauthenticate|reauth"],
      },
    ],
    founder: "If someone gets hold of an unlocked phone, they can take over the account or move money without proving who they are.",
    fix: "Ask for the password, biometrics or an OTP again before account changes and money movement.",
    refs: { masvs: ["MASVS-AUTH-3"], maswe: ["MASWE-0023"], cwe: ["CWE-306"] },
  },
];
