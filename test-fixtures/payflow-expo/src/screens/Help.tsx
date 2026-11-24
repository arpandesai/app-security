import { WebView } from "react-native-webview";
import { useLocalSearchParams } from "expo-router";
import { sendMoney } from "../lib/api";

export default function Help() {
  const { url } = useLocalSearchParams<{ url: string }>();
  return (
    <WebView
      source={{ uri: url }}
      originWhitelist={["*"]}
      onMessage={(e) => {
        const msg = JSON.parse(e.nativeEvent.data);
        if (msg.type === "pay") sendMoney(msg.to, msg.amount);
      }}
    />
  );
}
