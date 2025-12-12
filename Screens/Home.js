import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Image, ActivityIndicator,
  TouchableOpacity, useWindowDimensions, Platform, ScrollView
} from 'react-native';
import { FIREBASE_Auth, FIREBASE_DB } from '../firebaseconfig'; 
import { doc, onSnapshot } from 'firebase/firestore'; 
import { onAuthStateChanged } from 'firebase/auth';
import Feather from 'react-native-vector-icons/Feather';
import Dashboard from './Dashboard';
import Plans from './Plans'; 
import CVMaker from './CVMaker'; 

export default function Home({ navigation }) {
  const { width } = useWindowDimensions();
  const isDesktop = width > 900; 
  
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState({}); 
  const [activeTab, setActiveTab] = useState('Dashboard');

  useEffect(() => {
    if (!FIREBASE_Auth || !FIREBASE_DB) {
      setLoading(false);
      return;
    }

    const unsubscribeAuth = onAuthStateChanged(FIREBASE_Auth, (user) => {
      if (user) {
        const userDocRef = doc(FIREBASE_DB, "Profile", user.uid);
        
        const unsubscribeSnapshot = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
              setUserData(docSnap.data());
            } else {
              console.log("No profile found, initializing empty.");
              setUserData({}); 
            }
            setLoading(false);
          }, (err) => {
            console.error("Firestore Error:", err);
            setLoading(false);
          });
        return () => unsubscribeSnapshot();
      } else {
        setUserData({});
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  const handleMenuPress = (itemId) => {
    if (itemId === 'StartInterview') {
      navigation.navigate('Interview'); 
    } else {
      setActiveTab(itemId);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'Dashboard': 
        return <Dashboard userData={userData} isDesktop={isDesktop} />;
      
      case 'CVMaker': 
        return <CVMaker userData={userData} />; 
      
      case 'Plans': 
        return <Plans userData={userData} />;
      
      default: 
        return <Dashboard userData={userData} isDesktop={isDesktop} />;
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  const menuItems = [
    { id: 'Dashboard', icon: 'grid', label: 'Dashboard' },
    { id: 'StartInterview', icon: 'play-circle', label: 'Start Interview' }, 
    { id: 'CVMaker', icon: 'file-text', label: 'CV Maker' },
    { id: 'Plans', icon: 'package', label: 'Plans' },
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.sidebar, !isDesktop && styles.sidebarMobile]}>
        <View style={styles.logoContainer}>
           <Text style={styles.logoText}>{isDesktop ? 'Veridian' : 'V'}</Text>
        </View>
        <View style={styles.menuContainer}>
          {menuItems.map((item) => (
            <TouchableOpacity 
              key={item.id} 
              style={[
                styles.menuItem, 
                activeTab === item.id && styles.menuItemActive,
                item.id === 'StartInterview' && styles.menuItemHighlight 
              ]}
              onPress={() => handleMenuPress(item.id)}
            >
              <Feather 
                name={item.icon} 
                size={20} 
                color={activeTab === item.id || item.id === 'StartInterview' ? '#4F46E5' : '#64748B'} 
              />
              {isDesktop && (
                <Text style={[
                  styles.menuText, 
                  activeTab === item.id && styles.menuTextActive,
                  item.id === 'StartInterview' && styles.menuTextHighlight
                ]}>
                  {item.label}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.userSection}>
           <Image 
             source={{ uri: userData?.photoUrl || 'https://via.placeholder.com/40' }} 
             style={styles.userAvatar} 
           />
           {isDesktop && (
             <View style={{marginLeft: 10}}>
               <Text style={styles.userName} numberOfLines={1}>
                 {userData?.fullName || 'Guest'}
               </Text>
               <Text style={styles.userRole}>
                 {userData?.status || 'Free Plan'}
               </Text>
             </View>
           )}
        </View>
      </View>

      <View style={styles.mainContent}>
        {!isDesktop && (
          <View style={styles.mobileHeader}>
             <Text style={styles.headerTitle}>{activeTab}</Text>
          </View>
        )}
        
        <View style={{flex: 1}}>
           {renderContent()}
        </View>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    flexDirection: 'row', 
    backgroundColor: '#F8FAFC',
    height: Platform.OS === 'web' ? '100vh' : '100%' 
  },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#F8FAFC'
  },
  sidebar: {
    width: 250,
    backgroundColor: '#FFF',
    borderRightWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 24,
    paddingHorizontal: 16,
    display: 'flex',
    flexDirection: 'column',
    zIndex: 10,
  },
  sidebarMobile: {
    width: 70, 
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  logoContainer: { 
    marginBottom: 40, 
    paddingLeft: 12 
  },
  logoText: { 
    fontSize: 24, 
    fontWeight: '800', 
    color: '#4F46E5' 
  },
  menuContainer: { flex: 1 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  menuItemActive: { 
    backgroundColor: '#EEF2FF' 
  },
  menuItemHighlight: {
  },
  menuText: { 
    marginLeft: 12, 
    fontSize: 14, 
    color: '#64748B', 
    fontWeight: '500' 
  },
  menuTextActive: { 
    color: '#4F46E5', 
    fontWeight: '700' 
  },
  menuTextHighlight: {
    color: '#4F46E5',
    fontWeight: '600'
  },
  userSection: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderTopWidth: 1, 
    borderColor: '#F1F5F9', 
    paddingTop: 16 
  },
  userAvatar: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: '#E2E8F0' 
  },
  userName: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: '#0F172A', 
    width: 140 
  },
  userRole: { 
    fontSize: 12, 
    color: '#64748B' 
  },

  mainContent: { 
    flex: 1, 
    display: 'flex', 
    flexDirection: 'column',
    backgroundColor: '#F8FAFC' 
  },
  mobileHeader: {
    height: 60,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    paddingHorizontal: 20,
    elevation: 2,
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#1E293B' 
  },
});
