import type { Rule } from "../types";
import { G } from "./globs";

export const STORAGE_RULES: Rule[] = [
  {
    id: "MFS-STORAGE-01",
    category: "STORAGE",
    severity: "high",
    title: "Login tokens or personal data stored unencrypted",
    check:
      "Trace where the app stores auth tokens, refresh tokens, passwords, PINs, session IDs, sensitive personal data and AI chat history on the device.",
    failIf:
      "Any of those values is written to an unencrypted store: AsyncStorage, unencrypted MMKV, redux-persist/zustand persist on AsyncStorage, SharedPreferences, Hive without a cipher, GetStorage, plain SQLite, UserDefaults, @AppStorage, plain files. AI chat conversations count as sensitive personal data.",
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
    title: "Sensitive data leaking into logs or URLs",
    check:
      "Review log statements that can run in release builds, and URLs the app builds.",
    failIf:
      "Logs that run in release include tokens, passwords, OTPs, Authorization headers, full API responses with personal data, or card/bank details; or tokens, passwords, OTPs, API keys, email addresses or phone numbers are sent as URL query parameters.",
    passIf:
      "Logs are generic or wrapped in debug-only guards (__DEV__, kDebugMode, BuildConfig.DEBUG, #if DEBUG), console calls are stripped from production builds, and secrets travel in headers or request bodies.",
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
      {
        target: "any",
        scope: "URLs in all app code",
        lookIn: [G.js, G.dart, G.kotlinJava, G.swiftObjc],
        searchFor: ["[?&](token|access_token|password|otp|apiKey|api_key|email|phone)=", "\\?.*\\$\\{.*(token|password)"],
      },
    ],
    founder:
      "Logins and personal data end up in device logs, crash tools, server logs and analytics, where other people can read them.",
    fix:
      "Remove sensitive values from logs, guard debug logging behind build flags, strip console output from release builds, and send secrets in headers or request bodies, never in URLs.",
    refs: { masvs: ["MASVS-STORAGE-2", "MASVS-NETWORK-1"], maswe: ["MASWE-0005"], cwe: ["CWE-532", "CWE-598"] },
  },
  {
    id: "MFS-STORAGE-04",
    category: "STORAGE",
    severity: "medium",
    title: "Private app data copied into device backups",
    check: "Check backup configuration for Android and backup exclusion / Keychain accessibility for iOS.",
    failIf:
      "The app handles money, health or identity data, and: on Android, allowBackup is true or unset (default true) with no backup or data-extraction rules excluding files, databases or shared_prefs that hold sensitive data; on iOS, sensitive files aren't excluded from backup, or tokens are stored in Keychain with a non-ThisDeviceOnly accessibility class.",
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
  {
    id: "MFS-STORAGE-05",
    category: "STORAGE",
    severity: "medium",
    title: "Local database not encrypted",
    check:
      "Find on-device databases and what they store.",
    failIf:
      "The app handles money, health or identity data and stores sensitive records in an on-device database without encryption: SQLite/expo-sqlite/sqflite/Room/Core Data without SQLCipher or file protection, Realm without an encryptionKey, Hive without a cipher, WatermelonDB on plain SQLite.",
    passIf:
      "Sensitive on-device databases are encrypted with a key kept in Keychain/Keystore, or the app stores nothing sensitive in a local database.",
    variants: [
      {
        target: "react-native",
        scope: "React Native (JS/TS)",
        lookIn: [G.js],
        searchFor: ["expo-sqlite|react-native-sqlite|op-sqlite|watermelondb|realm", "encryptionKey|SQLCipher|cipher"],
      },
      {
        target: "flutter",
        scope: "Flutter (Dart)",
        lookIn: [G.dart, G.pubspec],
        searchFor: ["sqflite|drift|isar|hive|realm|objectbox", "sqlcipher|encryptionCipher|encryptionKey"],
      },
      {
        target: "android",
        scope: "Android (Kotlin/Java)",
        lookIn: [G.kotlinJava, G.gradle],
        searchFor: ["Room\\.databaseBuilder|SQLiteOpenHelper|openOrCreateDatabase", "SupportFactory|net\\.zetetic|sqlcipher"],
      },
      {
        target: "ios",
        scope: "iOS (Swift/ObjC)",
        lookIn: [G.swiftObjc],
        searchFor: ["NSPersistentContainer|sqlite3_open|GRDB|Realm", "NSFileProtectionComplete|\\.complete|cipher"],
      },
    ],
    founder:
      "Sensitive records kept in an on-device database are readable from a lost, rooted or backed-up phone.",
    fix:
      "Encrypt sensitive local databases (SQLCipher, Realm or Hive encryption, iOS file protection) with a key held in Keychain/Keystore.",
    refs: { masvs: ["MASVS-STORAGE-1"], maswe: ["MASWE-0006"], cwe: ["CWE-311"] },
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
    title: "Weak cryptography",
    check:
      "Identify the encryption algorithms and modes, hashing functions and random number sources the app uses for anything security-related.",
    failIf:
      "Any of: DES, 3DES, RC4 or Blowfish; AES in ECB mode (including Java Cipher.getInstance(\"AES\"), which defaults to ECB); home-made 'encryption' (XOR, Base64, ROT) protecting sensitive data; MD5 or SHA-1 for passwords, PINs, tokens, signatures or integrity checks; a fast hash (plain SHA-256) for stored passwords or PINs; or a non-cryptographic random generator (Math.random, Dart Random(), java.util.Random, rand()) creating tokens, OTPs, passwords, nonces, IVs, keys or invite codes.",
    passIf:
      "AES-GCM/ChaCha20-Poly1305 or platform crypto, SHA-256+ for integrity, a slow KDF for passwords, and a cryptographic RNG for security values. Non-security uses (MD5 cache keys, Math.random for UI) are fine. Not applicable if the app does no custom cryptography.",
    variants: [
      {
        target: "any",
        scope: "All app code",
        lookIn: [G.js, G.dart, G.kotlinJava, G.swiftObjc],
        searchFor: ["CryptoJS\\.(DES|TripleDES|RC4)", "mode\\.ECB|AESMode\\.ecb|/ECB/", "Cipher\\.getInstance\\(\"(AES|DES|DESede|RC4|Blowfish)\"\\)", "kCCAlgorithm(DES|3DES|RC4)|kCCOptionECBMode", "createCipher\\("],
      },
      {
        target: "any",
        scope: "All app code",
        lookIn: [G.js, G.dart, G.kotlinJava, G.swiftObjc],
        searchFor: ["md5|MD5", "sha1|SHA1|SHA-1", "Insecure\\.(MD5|SHA1)", "CC_MD5|CC_SHA1", "MessageDigest\\.getInstance\\(\"(MD5|SHA-1)\"", "createHash\\(['\"](md5|sha1)"],
      },
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
    founder:
      "The app protects data with outdated or predictable cryptography that attackers can break, reverse or guess with free tools.",
    fix:
      "Use AES-GCM or ChaCha20-Poly1305 through platform APIs, SHA-256+ for integrity, Argon2/scrypt/PBKDF2 for anything password-like, and the platform's secure random generator for every security value.",
    refs: { masvs: ["MASVS-CRYPTO-1"], maswe: ["MASWE-0007", "MASWE-0008", "MASWE-0012"], cwe: ["CWE-327", "CWE-328", "CWE-338"] },
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
