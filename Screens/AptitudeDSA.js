
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function AptitudeDSA({ userData, isDesktop, darkMode, theme, navigation }) {
  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <Text style={[styles.title, { color: theme.textMain }]}>
        Aptitude & DSA
      </Text>
      <Text style={[styles.subtitle, { color: theme.textSub }]}>
        Coming soon...
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
});