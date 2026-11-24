import { TextInput } from "react-native";

export function PasswordField(props: { value: string; onChangeText: (v: string) => void }) {
  return <TextInput placeholder="Password" value={props.value} onChangeText={props.onChangeText} />;
}
