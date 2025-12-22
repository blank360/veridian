import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, Modal, FlatList, useWindowDimensions, Platform, TextInput,
  Alert, KeyboardAvoidingView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { FIREBASE_Auth, FIREBASE_DB } from '../firebaseconfig'; 
import { doc, onSnapshot, updateDoc, setDoc } from 'firebase/firestore'; 
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as DocumentPicker from 'expo-document-picker';
import { onAuthStateChanged } from 'firebase/auth';
import Feather from 'react-native-vector-icons/Feather';

const UNIVERSAL_PARAMS = [
  "Communication", "Problem Understanding", "Problem Solving",
  "Domain Knowledge", "Behavioral", "Experience Depth", 
  "Confidence", "Overall Fit"
];

const DOMAIN_CONFIG = {
  "Technical (Software)": [ "Coding Quality", "DSA / Algorithms", "Domain Knowledge", "Debugging Skills", "System Design", "Testing & Documentation", "API / DB Understanding" ],
  "Marketing & Brand": [ "Campaign Strategy", "Creativity & Content", "Market Research", "Target Audience", "Social Media Tools", "SEO/SEM", "Analytics", "Brand Consistency" ],
  "Sales & Business Dev": [ "Lead Qualification", "Pitch Quality", "Objection Handling", "Negotiation", "Relationship Building", "Sales Funnel", "CRM Tools", "Closing Ability" ],
  "Customer Support": [ "Empathy", "Problem Resolution", "Tone & Professionalism", "Incident Handling", "Support Tools", "Retention Skills", "Calm Under Pressure" ],
  "Human Resources (HR)": [ "Recruitment", "Screening", "Conflict Resolution", "Stakeholder Mgmt", "HR Policies", "Interviewing", "Employee Engagement" ],
  "Product Manager": [ "Product Thinking", "User Understanding", "Prioritization", "Roadmapping", "PRDs/Stories", "Stakeholder Comm", "Data-driven Decision", "Trade-offs" ],
  "Business Analyst": [ "Requirements", "Process Mapping", "User Stories", "Data Interpretation", "Documentation", "Stakeholder Comm", "Problem Breakdown", "Impact Analysis" ],
  "Finance": [ "Financial Modeling", "Statements", "Accuracy", "Compliance", "Budgeting", "Excel Proficiency", "Risk Assessment" ],
  "Operations": [ "Process Optimization", "SLA Mgmt", "Inventory", "Vendor Mgmt", "Cost Control", "Quality Assurance", "Escalation", "Workflow" ],
  "Management": [ "Team Leadership", "Decision Making", "Strategic Thinking", "Delegation", "Conflict Mgmt", "Performance Mgmt", "Vision & Planning" ],
  "Administrative": [ "Docs Handling", "Organization", "Email Etiquette", "Coordination", "Time Mgmt", "Software Tools" ],
  "UI/UX Design": [ "User Research", "Wireframing", "Visual Design", "Figma/Adobe", "Accessibility", "Portfolio", "Usability Testing" ],
  "Data Analyst": [ "SQL", "Data Cleaning", "Dashboarding", "Problem Framing", "ML Algorithms", "Storytelling", "KPIs" ]
};

export default function Dashboard({ theme }) {
  const { width } = useWindowDimensions();
  const navigation = useNavigation();
  const isDesktop = width > 900; 
  const isWeb = Platform.OS === 'web';

  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState({}); 
  const [selectedDomain, setSelectedDomain] = useState("Technical (Software)");
  const [showDomainPicker, setShowDomainPicker] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false); 
  const [editForm, setEditForm] = useState({}); 
  const [uploadingImg, setUploadingImg] = useState(false);
  const [saving, setSaving] = useState(false);

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
              const data = docSnap.data();
              setUserData(data);
              setEditForm(data); 
            } else {
              setUserData({}); 
              setEditForm({});
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

  const pickImage = async () => {
    try {
        if (!FIREBASE_Auth.currentUser) {
            alert("Please login to upload a photo.");
            return;
        }

        if (Platform.OS === 'web') {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (file) await uploadImageToFirebase(file, file.name);
            };
            input.click();
        } else {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'image/*',
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const file = result.assets[0];
                await uploadImageToFirebase(file.uri, file.name, true);
            }
        }
    } catch (err) {
        console.error("Pick image error:", err);
        Alert.alert("Error", "Failed to pick image");
    }
  };

  const uploadImageToFirebase = async (fileOrUri, fileName, isMobile = false) => {
      setUploadingImg(true);
      try {
          const user = FIREBASE_Auth.currentUser;
          const storage = getStorage();
          const storageReference = storageRef(storage, `profile_photos/${user.uid}_${Date.now()}`);

          let blob;
          if (isMobile) {
              const response = await fetch(fileOrUri);
              blob = await response.blob();
          } else {
              blob = fileOrUri;
          }

          await uploadBytes(storageReference, blob);
          const downloadUrl = await getDownloadURL(storageReference);
          const userDocRef = doc(FIREBASE_DB, "Profile", user.uid);
          
          await updateDoc(userDocRef, { photoUrl: downloadUrl })
               .catch(async (err) => {
                   if (err.code === 'not-found') {
                       await setDoc(userDocRef, { photoUrl: downloadUrl }, { merge: true });
                   }
               });

      } catch (error) {
          console.error("Upload error:", error);
          alert("Failed to upload image.");
      } finally {
          setUploadingImg(false);
      }
  };
  const handleEditOpen = () => {
    setEditForm(userData);
    setShowEditProfileModal(true);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
        const user = FIREBASE_Auth.currentUser;
        if (!user) return;
        const userDocRef = doc(FIREBASE_DB, "Profile", user.uid);
        await updateDoc(userDocRef, editForm);
        setShowEditProfileModal(false);
        if (Platform.OS !== 'web') Alert.alert("Success", "Profile updated!");
    } catch (error) {
        console.error("Save Error:", error);
        Alert.alert("Error", "Failed to save profile.");
    } finally {
        setSaving(false);
    }
  };

  const isProfileIncomplete = () => {
    if (!userData || Object.keys(userData).length === 0) return true;
    const requiredFields = ['fullName', 'email', 'phone', 'degree', 'education'];
    return requiredFields.some(field => !userData[field] || userData[field] === '');
  };

  const getScore = (sourceObject, key) => {
    try {
      if (!sourceObject) return 0;
      return sourceObject[key] || 
             sourceObject[key.toLowerCase()] || 
             sourceObject[key.replace(/ /g, '_').toLowerCase()] || 
             0;
    } catch (err) {
      return 0;
    }
  };

  const renderProgressBar = (label, score, color = "#4F46E5") => (
    <View key={label} style={styles.skillRow}>
      <Text style={[styles.skillLabel, { color: theme.textSub }]}>{label}</Text>
      <View style={styles.skillBarContainer}>
        <View style={[styles.progressBarBackground, { backgroundColor: theme.bg }]}>
          <View style={[styles.progressBarFill, { width: `${(score / 10) * 100}%`, backgroundColor: color }]} />
        </View>
      </View>
      <Text style={[styles.skillScore, { color: theme.textSub }]}>{score}/10</Text>
    </View>
  );

  const parseSkills = (skillsData) => {
    if (!skillsData) return [];
    if (Array.isArray(skillsData)) return skillsData;
    if (typeof skillsData === 'string') {
      return skillsData.split(',').map(s => s.trim()).filter(s => s);
    }
    return [];
  };

  const renderField = (label, value) => {
    return (
      <View style={styles.infoItem}>
        <Text style={[styles.label, { color: theme.textSub }]}>{label}</Text>
        <Text style={[styles.value, { color: theme.textMain }]}>{value || "Not Listed"}</Text>
      </View>
    );
  };

  const renderEditInput = (label, field, placeholder, multiline=false) => (
    <View style={{ marginBottom: 12 }}>
        <Text style={[styles.label, { color: theme.textSub }]}>{label}</Text>
        <TextInput 
            style={[
                styles.input, 
                multiline && styles.multilineInput,
                { backgroundColor: theme.bg, color: theme.textMain, borderColor: theme.border }
            ]}
            value={editForm[field]}
            onChangeText={(text) => setEditForm({...editForm, [field]: text})}
            placeholder={placeholder}
            placeholderTextColor={theme.textSub}
            multiline={multiline}
        />
    </View>
  );

  if (loading) return <View style={[styles.center, { backgroundColor: theme.bg }]}><ActivityIndicator size="large" color="#4F46E5" /></View>;

  const renderContent = () => (
    <>
      <View style={isDesktop ? styles.row : styles.column}>
        <View style={[
            styles.card, 
            { backgroundColor: theme.cardBg, borderColor: theme.border },
            isDesktop ? { flex: 0.55, marginRight: 20 } : { marginBottom: 20 }
        ]}>
          <View style={styles.cvHeader}>
             <View>
               <Text style={[styles.cvTitle, { color: theme.textMain }]}>Trusted CV</Text>
               <Text style={[styles.cvSubtitle, { color: theme.textSub }]}>Verified Candidate Profile</Text>
             </View>
             <View style={styles.verifiedBadge}><Text style={styles.verifiedText}>✓ Verified</Text></View>
          </View>
          <View style={styles.cvBody}>
             <View style={styles.cvProfileRow}>
               <TouchableOpacity onPress={pickImage} style={styles.avatarWrapper}>
                   {uploadingImg ? (
                       <View style={[styles.cvBigAvatar, styles.center, { backgroundColor: theme.bg }]}>
                           <ActivityIndicator size="small" color="#4F46E5" />
                       </View>
                   ) : userData?.photoUrl ? (
                       <Image 
                         source={{ uri: userData.photoUrl }} 
                         style={styles.cvBigAvatar}
                       />
                   ) : (
                       <View style={[styles.cvBigAvatar, styles.emptyAvatar, { backgroundColor: theme.bg, borderColor: theme.border }]}>
                           <Feather name="camera" size={24} color={theme.textSub} />
                           <Text style={[styles.addPhotoText, { color: theme.textSub }]}>Add</Text>
                       </View>
                   )}
                   <View style={[styles.avatarEditBadge, { backgroundColor: theme.primary }]}>
                       <Feather name="edit-2" size={10} color="#FFF" />
                   </View>
               </TouchableOpacity>
               <View style={styles.cvInfo}>
                 <Text style={[styles.cvName, { color: theme.textMain }]}>{userData?.fullName || "Candidate Name"}</Text>
                 <Text style={[styles.cvRole, { color: theme.textSub }]}>{userData?.currentRole || userData?.status || "Job Seeker"}</Text>
                 <Text style={[styles.cvExp, { color: theme.textSub }]}>Years Experience: {userData?.yearsOfExperience || "0"}</Text>
                 <View style={styles.cvTags}>
                    <Text style={[styles.tag, { backgroundColor: theme.bg, color: theme.textSub }]}>{userData?.location || "Location N/A"}</Text>
                 </View>
               </View>
             </View>
             <TouchableOpacity 
               style={[styles.editProfileBtn, { backgroundColor: theme.primary, marginBottom: 10 }]}
               onPress={handleEditOpen}
             >
               <Feather name="edit-3" size={16} color="#FFF" />
               <Text style={styles.editProfileBtnText}>Edit Profile</Text>
             </TouchableOpacity>

             {userData?.cvUrl && (
               <TouchableOpacity 
                 style={[styles.downloadBtn, { backgroundColor: theme.textMain }]}
                 onPress={() => {
                   if (Platform.OS === 'web') {
                     window.open(userData.cvUrl, '_blank');
                   }
                 }}
               >
                  <Text style={[styles.downloadBtnText, { color: theme.cardBg }]}>Download Full Resume</Text>
               </TouchableOpacity>
             )}
          </View>
        </View>
        <View style={[
            styles.card, 
            styles.purpleCard,
            isDesktop ? { flex: 0.45 } : { marginBottom: 20 }
        ]}>
           <View style={{flexDirection:'row', justifyContent:'space-between', marginBottom: 20}}>
              <Text style={[styles.cardTitle, {color:'#FFF'}]}>Interview Performance</Text>
              <Text style={{color:'#C7D2FE'}}>Last 5 Avg</Text>
           </View>
           <View style={styles.performanceContent}>
              <View style={styles.radialWrapper}>
                <View style={styles.radialOuter}>
                   <View style={styles.radialInner}>
                      <Text style={styles.radialNumber}>{userData?.avgScore || "0.0"}</Text>
                      <Text style={styles.radialLabel}>/ 10</Text>
                   </View>
                </View>
              </View>
              <View style={styles.statsColumn}>
                 <Text style={{color:'#E0E7FF', marginBottom:10}}>Universal Scores</Text>
                 <View style={styles.statsGrid}>
                    {UNIVERSAL_PARAMS.map((param, idx) => {
                       const score = getScore(userData?.universalScores, param);
                       return (
                         <View key={idx} style={styles.statBox}>
                            <Text style={styles.statScore}>{score}</Text>
                            <Text style={styles.statLabel} numberOfLines={1}>{param}</Text>
                         </View>
                       );
                    })}
                 </View>
              </View>
           </View>
        </View>
      </View>
      <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.textMain }]}>Career & Academic Profile</Text>
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        
        <View style={isDesktop ? styles.row : styles.column}>
          <View style={[isDesktop ? { flex: 0.4, borderRightWidth:1, borderColor: theme.border, paddingRight:20 } : { marginBottom:20 }]}>
            <Text style={styles.sectionHeader}>Education</Text>
            
            {renderField("Institute", userData?.institution)}
            {renderField("Degree", userData?.degree)}
            {renderField("Education Level", userData?.education)}
            {renderField("Graduation Year", userData?.graduationYear)}
            <View style={[styles.cgpaContainer, { backgroundColor: theme.bg }]}>
              <Text style={[styles.label, { color: theme.textSub }]}>CGPA / 10</Text>
              <View style={[styles.cgpaCircle, { borderColor: '#22C55E', backgroundColor: theme.cardBg }]}>
                <Text style={styles.cgpaText}>{userData?.cgpa || "N/A"}</Text>
              </View>
              <Text style={{fontSize:10, color: theme.textSub, marginTop:5}}>Cumulative Grade Point</Text>
            </View>
          </View>
          <View style={[isDesktop ? { flex: 0.6, paddingLeft:20 } : {}]}>
            <Text style={styles.sectionHeader}>Professional Details</Text>
            
            <View style={styles.detailGrid}>
              <View style={[styles.detailBox, { backgroundColor: theme.bg }]}>
                {renderField("Current Role", userData?.currentRole)}
              </View>
              <View style={[styles.detailBox, { backgroundColor: theme.bg }]}>
                {renderField("Experience (Years)", userData?.yearsOfExperience)}
              </View>
            </View>

            {renderField("Work Experience", userData?.workExperience)}
            {renderField("Projects", userData?.projects)}

            <View style={styles.infoItem}>
              <Text style={[styles.label, { color: theme.textSub }]}>Skills</Text>
              <View style={styles.chipContainer}>
                {parseSkills(userData?.skills).length > 0 ? 
                  parseSkills(userData?.skills).map((s,i)=>(<Text key={i} style={[styles.chip, { backgroundColor: theme.activeItemBg, color: theme.primary }]}>{s}</Text>)) 
                  : <Text style={[styles.value, { color: theme.textMain }]}>N/A</Text>
                }
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.infoItem, {flex:1}]}>
                {renderField("Certificates", userData?.certifications)}
              </View>
              <View style={[styles.infoItem, {flex:1}]}>
                {renderField("Achievements", userData?.achievements)}
              </View>
            </View>

            {renderField("Languages", userData?.languages)}
          </View>

        </View>
      </View>
      <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        <View style={styles.domainHeader}>
          <Text style={[styles.cardTitle, { color: theme.textMain }]}>Domain Score</Text>
          <TouchableOpacity style={[styles.dropdownBtn, { backgroundColor: theme.activeItemBg }]} onPress={() => setShowDomainPicker(true)}>
            <Text style={[styles.dropdownText, { color: theme.primary }]}>{selectedDomain} ▼</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <View style={isDesktop ? styles.grid2Col : styles.column}>
           {DOMAIN_CONFIG[selectedDomain]?.map((skill) => {
              const domainData = userData?.domainScores ? userData.domainScores[selectedDomain] : {};
              const score = getScore(domainData, skill);
              return (
                <View key={skill} style={isDesktop ? {width: '48%'} : {width: '100%'}}>
                  {renderProgressBar(skill, score, "#F59E0B")}
                </View>
              );
           })}
        </View>
      </View>

      <View style={{height: 50}} />
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { backgroundColor: theme.cardBg }]}>
        <View style={{flex: 1}}>
          <Text style={[styles.headerTitle, { color: theme.textMain }]}>Dashboard</Text>
          {isProfileIncomplete() && (
            <Text style={styles.incompleteLabel}>⚠️ Setup Profile - Click 'Edit Profile'</Text>
          )}
        </View>
      </View>
      {isWeb ? (
        <div style={{ 
          height: '100vh', 
          width: '100%', 
          overflow: 'auto',
          WebkitOverflowScrolling: 'touch',
          backgroundColor: theme.bg
        }}>
          <View style={styles.scrollContent}>
            {renderContent()}
          </View>
        </div>
      ) : (
        <ScrollView 
          style={[styles.scrollView, { backgroundColor: theme.bg }]} 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
        >
          {renderContent()}
        </ScrollView>
      )}
      <Modal visible={showEditProfileModal} transparent={true} animationType="slide">
        <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalOverlay}
        >
            <View style={[styles.modalContent, { backgroundColor: theme.cardBg, height: '85%', width: isDesktop ? 500 : '90%' }]}>
                <View style={styles.modalHeader}>
                    <Text style={[styles.modalTitle, { color: theme.textMain }]}>Edit Profile</Text>
                    <TouchableOpacity onPress={() => setShowEditProfileModal(false)}>
                        <Feather name="x" size={24} color={theme.textSub} />
                    </TouchableOpacity>
                </View>
                
                <ScrollView 
                    style={{ flex: 1 }} 
                    showsVerticalScrollIndicator={false} 
                    contentContainerStyle={{ paddingBottom: 30 }}
                >
                    <Text style={[styles.sectionHeader, { marginTop: 10 }]}>Basic Info</Text>
                    {renderEditInput("Full Name", "fullName", "Your Name")}
                    {renderEditInput("Current Role", "currentRole", "e.g. Software Engineer")}
                    {renderEditInput("Location", "location", "City, Country")}
                    {renderEditInput("Phone", "phone", "+1 234...")}

                    <Text style={[styles.sectionHeader, { marginTop: 20 }]}>Academic</Text>
                    {renderEditInput("Institute", "institution", "University Name")}
                    {renderEditInput("Degree", "degree", "e.g. B.Tech CS")}
                    {renderEditInput("Graduation Year", "graduationYear", "2024")}
                    {renderEditInput("CGPA", "cgpa", "e.g. 9.5")}

                    <Text style={[styles.sectionHeader, { marginTop: 20 }]}>Professional</Text>
                    {renderEditInput("Years Experience", "yearsOfExperience", "0")}
                    {renderEditInput("Skills (comma separated)", "skills", "React, Node...", true)}
                    {renderEditInput("Work Experience", "workExperience", "Describe your experience...", true)}
                    {renderEditInput("Projects", "projects", "List your projects...", true)}
                </ScrollView>

                <View style={{ paddingTop: 10, borderTopWidth: 1, borderColor: theme.border }}>
                    <TouchableOpacity 
                        style={[styles.saveBtn, { backgroundColor: theme.primary }]}
                        onPress={handleSaveProfile}
                        disabled={saving}
                    >
                        {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
      </Modal>
      <Modal visible={showDomainPicker} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBg, maxHeight: '60%', width: 320 }]}>
            <Text style={[styles.modalTitle, { color: theme.textMain }]}>Select Domain</Text>
            <FlatList
              data={Object.keys(DOMAIN_CONFIG)}
              keyExtractor={item => item}
              renderItem={({ item }) => (
                <TouchableOpacity style={[styles.modalItem, { borderColor: theme.border }]} onPress={() => { setSelectedDomain(item); setShowDomainPicker(false); }}>
                  <Text style={[styles.modalText, { color: theme.textMain }, item === selectedDomain && {color: '#4F46E5', fontWeight:'bold'}]}>{item}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={[styles.closeBtn, { backgroundColor: theme.primary }]} onPress={() => setShowDomainPicker(false)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100, 
    flexGrow: 1,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  column: { flexDirection: 'column' },
  grid2Col: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
  headerTitle: { fontSize: 24, fontWeight: 'bold' },
  incompleteLabel: { fontSize: 11, color: '#F59E0B', marginTop: 4, fontWeight: '600' },
  card: { borderRadius: 12, padding: 24, marginBottom: 20, shadowColor: '#64748B', shadowOpacity: 0.08, shadowRadius: 10, elevation: 2, borderWidth: 1 },
  cardTitle: { fontSize: 18, fontWeight: '700' },
  divider: { height: 1, marginVertical: 16 },
  sectionHeader: { fontSize:16, fontWeight:'700', color:'#4F46E5', marginBottom:15, textTransform:'uppercase', letterSpacing:0.5 },
  infoItem: { marginBottom: 12 },
  label: { fontSize: 12, fontWeight:'600', marginBottom: 2 },
  value: { fontSize: 14, lineHeight:20 },
  detailGrid: { flexDirection: 'row', gap: 20, marginBottom: 15 },
  detailBox: { padding:10, borderRadius:8, flex:1 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop:4 },
  chip: { fontSize: 11, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12, fontWeight:'600' },
  cgpaContainer: { alignItems:'center', marginTop:20, padding:15, borderRadius:12 },
  cgpaCircle: { width: 80, height: 80, borderRadius: 40, borderWidth: 8, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  cgpaText: { fontSize: 24, fontWeight: 'bold', color: '#15803D' },
  cvHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  cvTitle: { fontSize: 20, fontWeight: '800' },
  cvSubtitle: { fontSize: 12 },
  verifiedBadge: { backgroundColor: '#DCFCE7', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 20 },
  verifiedText: { color: '#166534', fontSize: 12, fontWeight: '700' },
  cvBody: {},
  cvProfileRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  cvBigAvatar: { width: 80, height: 80, borderRadius: 12 },
  emptyAvatar: { justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderStyle: 'dashed' },
  addPhotoText: { fontSize: 10, marginTop: 4, fontWeight: '600' },
  avatarWrapper: { position: 'relative' },
  avatarEditBadge: { position: 'absolute', bottom: -5, right: -5, width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FFF' },
  cvInfo: { marginLeft: 16, flex: 1 },
  cvName: { fontSize: 20, fontWeight: 'bold' },
  cvRole: { fontSize: 14, marginBottom: 4 },
  cvExp: { fontSize: 12, marginBottom: 8 },
  cvTags: { flexDirection: 'row', gap: 6 },
  tag: { fontSize: 10, paddingVertical: 2, paddingHorizontal: 6, borderRadius: 4 },
  editProfileBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 8, gap: 8 },
  editProfileBtnText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  downloadBtn: { paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  downloadBtnText: { fontWeight: '600', fontSize: 14 },
  purpleCard: { backgroundColor: '#4F46E5', borderColor: '#4338CA' },
  performanceContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  radialWrapper: { width: 100, height: 100, borderRadius: 50, borderWidth: 8, borderColor: '#818CF8', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)' },
  radialOuter: { width: 84, height: 84, borderRadius: 42, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  radialInner: { alignItems: 'center' },
  radialNumber: { fontSize: 28, fontWeight: 'bold', color: '#FFF' },
  radialLabel: { fontSize: 12, color: '#C7D2FE' },
  statsColumn: { flex: 1, paddingLeft: 20 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statBox: { backgroundColor: 'rgba(255,255,255,0.15)', padding: 8, borderRadius: 8, alignItems: 'center', width: '30%', marginBottom: 5 },
  statScore: { color: '#4ADE80', fontWeight: 'bold', fontSize: 16 },
  statLabel: { color: '#E0E7FF', fontSize: 9, marginTop: 2, textAlign: 'center' },
  skillRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  skillLabel: { width: 140, fontSize: 13, fontWeight: '500' },
  skillBarContainer: { flex: 1, marginHorizontal: 10 },
  progressBarBackground: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },
  skillScore: { width: 40, textAlign: 'right', fontSize: 13 },
  domainHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dropdownBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  dropdownText: { fontWeight: '600', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { borderRadius: 12, padding: 20, shadowColor:'#000', shadowOpacity:0.25, shadowRadius:20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  modalItem: { paddingVertical: 12, borderBottomWidth: 1 },
  modalText: { fontSize: 15 },
  closeBtn: { marginTop: 16, padding: 12, borderRadius: 8, alignItems: 'center' },
  closeBtnText: { color: '#FFF', fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 14 },
  multilineInput: { minHeight: 80, textAlignVertical: 'top' },
  saveBtn: { paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});
