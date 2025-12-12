import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

export default function Plans() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.creditCard}>
        <View>
          <Text style={styles.creditTitle}>Available Credits</Text>
          <Text style={styles.creditValue}>00</Text>
          <Text style={styles.creditSub}>Renewal in XX days</Text>
        </View>
        <Feather name="award" size={48} color="#FFD700" />
      </View>

      <Text style={styles.sectionTitle}>Subscription Plans</Text>

      <View style={styles.planGrid}>
        <View style={styles.planCard}>
          <Text style={styles.planName}>Normal</Text>
          <Text style={styles.planPrice}>₹12<Text style={styles.period}> </Text></Text>
          <View style={styles.features}>
            <Text style={styles.featureItem}>• 1 Credit/interview</Text>
            <Text style={styles.featureItem}>• Basic Feedback</Text>
          </View>
          <TouchableOpacity style={[styles.btn, styles.btnOutline]}>
            <Text style={styles.btnTextOutline}>Upgrade</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.planCard}>
          <Text style={styles.planName}>recomended</Text>
          <Text style={styles.planPrice}>₹49<Text style={styles.period}> </Text></Text>
          <View style={styles.features}>
            <Text style={styles.featureItem}>• 5 Credit/interview</Text>
            <Text style={styles.featureItem}>• Priority Support</Text>
          </View>
          <TouchableOpacity style={[styles.btn, styles.btnOutline]}>
            <Text style={styles.btnTextOutline}>Upgrade</Text>
          </TouchableOpacity>
        </View>

        

        <View style={[styles.planCard, styles.popularPlan]}>
          <Text style={[styles.planName, {color:'#FFF'}]}>Pro</Text>
          <Text style={[styles.planPrice, {color:'#FFF'}]}>₹600<Text style={[styles.period, {color:'#E0E7FF'}]}>/mo</Text></Text>
          <View style={styles.features}>
            <Text style={[styles.featureItem, {color:'#E0E7FF'}]}>• 150 Credits/Interviews</Text>
            <Text style={[styles.featureItem, {color:'#E0E7FF'}]}>• Detailed Analytics</Text>
            <Text style={[styles.featureItem, {color:'#E0E7FF'}]}>• Priority Support</Text>
          </View>
          <TouchableOpacity style={styles.btnWhite}>
            <Text style={styles.btnTextPrimary}>Upgrade</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, flex: 1, backgroundColor: '#F8FAFC' },
  
  creditCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  creditTitle: { color: '#94A3B8', fontSize: 14, fontWeight: '600' },
  creditValue: { color: '#FFF', fontSize: 36, fontWeight: 'bold', marginVertical: 4 },
  creditSub: { color: '#64748B', fontSize: 12 },

  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#1E293B', marginBottom: 20 },
  
  planGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  planCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    flex: 1,
    minWidth: 250,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
    borderWidth: 1, borderColor: '#F1F5F9'
  },
  popularPlan: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  
  planName: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  planPrice: { fontSize: 32, fontWeight: '800', color: '#0F172A', marginVertical: 10 },
  period: { fontSize: 14, fontWeight: '500', color: '#64748B' },
  
  features: { marginBottom: 24 },
  featureItem: { fontSize: 14, color: '#475569', marginBottom: 8 },
  
  btn: { padding: 12, borderRadius: 8, alignItems: 'center' },
  btnOutline: { borderWidth: 1, borderColor: '#CBD5E1' },
  btnTextOutline: { fontWeight: '600', color: '#475569' },
  
  btnWhite: { backgroundColor: '#FFF', padding: 12, borderRadius: 8, alignItems: 'center' },
  btnTextPrimary: { fontWeight: '700', color: '#4F46E5' },
});