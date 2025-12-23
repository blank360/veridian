import { View, Text, StyleSheet } from 'react-native';
export default function CVMaker() {
  return <View style={styles.center} ><Text style={{ color: '#22c55e' }}>CV Maker Module</Text></View>;
}
const styles = StyleSheet.create({ center: { flex: 1, justifyContent: 'center', alignItems: 'center' } });
