import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Image, ActivityIndicator,
  TouchableOpacity, useWindowDimensions, Platform, Switch, ScrollView, TextInput
} from 'react-native';
import { FIREBASE_Auth, FIREBASE_DB } from '../firebaseconfig'; 
import { doc, onSnapshot } from 'firebase/firestore'; 
import { onAuthStateChanged } from 'firebase/auth';
import { Feather } from '@expo/vector-icons';
import Dashboard from './Dashboard';
import Plans from './Plans'; 
import CVMaker from './CVMaker'; 
import AptitudeDSA from './AptitudeDSA';

const TermsPanel = ({ theme }) => (
  <ScrollView contentContainerStyle={{ padding: 24, flex:1, backgroundColor: theme.bg }}>
    <Text style={[styles.panelTitle, { color: theme.textMain }]}>Terms & Conditions</Text>
    <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
      <Text style={{ color: theme.textSub, lineHeight: 24 }}>
        <Text style={{fontWeight: 'bold', color: theme.textMain}}>1. Acceptance: </Text>By using Veridian, you agree to our terms.{'\n\n'}
        <Text style={{fontWeight: 'bold', color: theme.textMain}}>2. Privacy: </Text>Your data is stored securely via Firebase.{'\n\n'}
        <Text style={{fontWeight: 'bold', color: theme.textMain}}>3. Usage: </Text>Veridian is for interview preparation purposes only.
      </Text>
    </View>
  </ScrollView>
);

const FeedbackPanel = ({ theme }) => (
  <ScrollView contentContainerStyle={{ padding: 24, flex:1, backgroundColor: theme.bg }}>
    <Text style={[styles.panelTitle, { color: theme.textMain }]}>Send Feedback</Text>
    <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
      <Text style={{ color: theme.textSub, marginBottom: 12 }}>
        We would love to hear your thoughts on how to improve Veridian.
      </Text>
      <TextInput 
        placeholder="Type your feedback here..." 
        placeholderTextColor={theme.textSub}
        multiline
        style={[styles.input, { color: theme.textMain, borderColor: theme.border, backgroundColor: theme.bg }]} 
      />
      <TouchableOpacity style={[styles.button, { backgroundColor: theme.primary }]}>
        <Text style={{ color: '#000', fontWeight: 'bold' }}>Submit Feedback</Text>
      </TouchableOpacity>
    </View>
  </ScrollView>
);

export default function Home({ navigation }) {
  const { width } = useWindowDimensions();
  const isDesktop = width > 900; 
  
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState({}); 
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [darkMode, setDarkMode] = useState(true); 

  const theme = {
    bg: darkMode ? '#000000' : '#F8FAFC',           
    sidebarBg: darkMode ? '#000000' : '#FFFFFF',    
    cardBg: darkMode ? '#09090b' : '#FFFFFF',      
    textMain: darkMode ? '#FAFAFA' : '#0F172A',     
    textSub: darkMode ? '#A1A1AA' : '#64748B',      
    border: darkMode ? '#27272a' : '#E2E8F0',       
    activeItemBg: darkMode ? '#18181b' : '#EEF2FF', 
    primary: '#22c55e',                             
    iconActive: '#22c55e',                          
    iconInactive: darkMode ? '#525252' : '#64748B'  
  };

  useEffect(() => {
    if (!FIREBASE_Auth || !FIREBASE_DB) {
      setLoading(false); 
      return;
    }
    
    let unsubscribeSnapshot = null;
    
    const unsubscribeAuth = onAuthStateChanged(FIREBASE_Auth, (user) => {
      if (user) {
        const userDocRef = doc(FIREBASE_DB, "Profile", user.uid);
        unsubscribeSnapshot = onSnapshot(
          userDocRef, 
          (docSnap) => {
            if (docSnap.exists()) setUserData(docSnap.data());
            else setUserData({}); 
            setLoading(false);
          }, 
          (err) => { 
            console.error(err); 
            setLoading(false); 
          }
        );
      } else {
        setUserData({}); 
        setLoading(false);
      }
    });
    
    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  const handleMenuPress = (itemId) => {
    if (itemId === 'StartInterview') navigation.navigate('Interview'); 
    else setActiveTab(itemId);
  };

  const renderContent = () => {
    const commonProps = { userData, isDesktop, darkMode, theme, navigation };
    
    switch (activeTab) {
      case 'Dashboard': return <Dashboard {...commonProps} />;
      case 'CVMaker': return <CVMaker {...commonProps} />; 
      case 'AptitudeDSA': return <AptitudeDSA {...commonProps} />;
      case 'Plans': return <Plans {...commonProps} />;
      case 'Terms': return <TermsPanel {...commonProps} />;
      case 'Feedback': return <FeedbackPanel {...commonProps} />;
      default: return <Dashboard {...commonProps} />;
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const menuItems = [
    { id: 'Dashboard', icon: 'grid', label: 'Dashboard' },
    { id: 'StartInterview', icon: 'play-circle', label: 'Start Interview' }, 
    { id: 'CVMaker', icon: 'file-text', label: 'CV Maker' },
    { id: 'AptitudeDSA', icon: 'cpu', label: 'Aptitude & DSA' },
    { id: 'Plans', icon: 'package', label: 'Plans' },
    { id: 'Terms', icon: 'shield', label: 'T&C' },
    { id: 'Feedback', icon: 'message-square', label: 'Feedback' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[
        styles.sidebar, 
        !isDesktop && styles.sidebarMobile,
        { backgroundColor: theme.sidebarBg, borderColor: theme.border }
      ]}>
        <View style={styles.logoContainer}>
           <Text style={[styles.logoText, { color: theme.primary }]}>
             {isDesktop ? 'Veridian' : 'V'}
           </Text>
        </View>
        <View style={styles.menuContainer}>
          {menuItems.map((item) => (
            <TouchableOpacity 
              key={item.id} 
              style={[
                styles.menuItem, 
                activeTab === item.id && { backgroundColor: theme.activeItemBg },
              ]}
              onPress={() => handleMenuPress(item.id)}
            >
              <Feather 
                name={item.icon} 
                size={20} 
                color={activeTab === item.id ? theme.iconActive : theme.iconInactive} 
              />
              {isDesktop && (
                <Text style={[
                  styles.menuText, 
                  { color: theme.textSub },
                  activeTab === item.id && { color: theme.primary, fontWeight: '700' }
                ]}>
                  {item.label}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
        <View style={[styles.toggleSection, { borderColor: theme.border }]}>
            {isDesktop ? (
                <View style={styles.toggleRow}>
                    <View style={{flexDirection:'row', alignItems:'center'}}>
                        <Feather name={darkMode ? "moon" : "sun"} size={18} color={theme.textSub} />
                        <Text style={[styles.toggleLabel, { color: theme.textSub }]}>
                            {darkMode ? 'Dark' : 'Light'}
                        </Text>
                    </View>
                    <Switch 
                        value={darkMode} 
                        onValueChange={setDarkMode}
                        trackColor={{ false: '#CBD5E1', true: theme.primary }}
                        thumbColor={'#FFF'}
                    />
                </View>
            ) : (
                <Switch 
                    value={darkMode} 
                    onValueChange={setDarkMode}
                    trackColor={{ false: '#CBD5E1', true: theme.primary }}
                    thumbColor={'#FFF'}
                />
            )}
        </View>

        <View style={[styles.userSection, { borderColor: theme.border }]}>
           <Image 
             source={{ uri: userData?.photoUrl || 'https://via.placeholder.com/40' }} 
             style={styles.userAvatar} 
           />
           {isDesktop && (
             <View style={{marginLeft: 10}}>
               <Text style={[styles.userName, { color: theme.textMain }]} numberOfLines={1}>
                 {userData?.fullName || 'Guest'}
               </Text>
               <Text style={[styles.userRole, { color: theme.textSub }]}>
                 {userData?.status || 'Free Plan'}
               </Text>
             </View>
           )}
        </View>
      </View>
      <View style={[styles.mainContent, { backgroundColor: theme.bg }]}>
        {!isDesktop && (
          <View style={[styles.mobileHeader, { backgroundColor: theme.sidebarBg, borderColor: theme.border }]}>
             <Text style={[styles.headerTitle, { color: theme.textMain }]}>{activeTab}</Text>
             <TouchableOpacity onPress={() => setDarkMode(!darkMode)} style={{ padding: 8 }}>
                <Feather name={darkMode ? "sun" : "moon"} size={22} color={theme.textMain} />
             </TouchableOpacity>
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
    height: Platform.OS === 'web' ? '100vh' : '100%' 
  },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  sidebar: {
    width: 250,
    borderRightWidth: 1,
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
  menuText: { 
    marginLeft: 12, 
    fontSize: 14, 
    fontWeight: '500' 
  },
  toggleSection: {
    marginBottom: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4
  },
  toggleLabel: {
    fontSize: 13,
    marginLeft: 8,
    fontWeight: '600'
  },
  userSection: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingTop: 16 
  },
  userAvatar: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: '#3F3F46' 
  },
  userName: { 
    fontSize: 14, 
    fontWeight: '700', 
    width: 140 
  },
  userRole: { 
    fontSize: 12, 
  },
  mainContent: { 
    flex: 1, 
    display: 'flex', 
    flexDirection: 'column',
  },
  mobileHeader: {
    height: 60,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', 
    paddingHorizontal: 20,
    elevation: 2,
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
  },
  panelTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  card: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  input: {
    height: 100,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  button: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
});
