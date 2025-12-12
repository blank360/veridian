import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, Modal, FlatList, useWindowDimensions, Platform, TextInput,
  Alert
} from 'react-native';
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

export default function Home() {
  const { width } = useWindowDimensions();
  const isDesktop = width > 900; 
  const isWeb = Platform.OS === 'web';

  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState({}); 
  const [selectedDomain, setSelectedDomain] = useState("Technical (Software)");
  const [showDomainPicker, setShowDomainPicker] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);

  useEffect(() => {
    if (!FIREBASE_Auth || !FIREBASE_DB) {
      console.warn("Firebase config missing or invalid");
      setLoading(false);
      return;
    }

    const unsubscribeAuth = onAuthStateChanged(
      FIREBASE_Auth, 
      (user) => {
        if (user) {
          const userDocRef = doc(FIREBASE_DB, "Profile", user.uid);
          
          const unsubscribeSnapshot = onSnapshot(
            userDocRef,
            (docSnap) => {
              if (docSnap.exists()) {
                setUserData(docSnap.data());
              } else {
                console.log("No profile found, loading default template");
                setUserData({}); 
              }
              setLoading(false);
            },
            (err) => {
              console.error("Firestore error (loading default):", err);
              setUserData({});
              setLoading(false);
            }
          );
          return () => unsubscribeSnapshot();
        } else {
          setUserData({});
          setLoading(false);
        }
      },
      (err) => {
        console.error("Auth error:", err);
        setUserData({});
        setLoading(false);
      }
    );

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
                if (file) {
                    await uploadImageToFirebase(file, file.name);
                }
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

  const isProfileIncomplete = () => {
    if (!userData || Object.keys(userData).length === 0) return true;
    const requiredFields = ['fullName', 'email', 'phone', 'degree', 'education'];
    return requiredFields.some(field => !userData[field] || userData[field] === '');
  };

  const handleEdit = (fieldName, currentValue) => {
    setEditingField(fieldName);
    setEditValue(currentValue || '');
  };

  const handleSave = async (fieldName) => {
    if (!FIREBASE_Auth.currentUser) {
        alert("You must be logged in to save changes.");
        return;
    }
    
    setSaving(true);
    try {
      const userDocRef = doc(FIREBASE_DB, "Profile", FIREBASE_Auth.currentUser.uid);
      await updateDoc(userDocRef, {
        [fieldName]: editValue
      }).catch(async (err) => {
          if (err.code === 'not-found') {
             const { setDoc } = require('firebase/firestore'); 
             await setDoc(userDocRef, { [fieldName]: editValue }, { merge: true });
          } else {
              throw err;
          }
      });

      setEditingField(null);
      setEditValue('');
    } catch (err) {
      console.error("Error updating field:", err);
      alert("Failed to save. Please check connection.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingField(null);
    setEditValue('');
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
      <Text style={styles.skillLabel}>{label}</Text>
      <View style={styles.skillBarContainer}>
        <View style={styles.progressBarBackground}>
          <View style={[styles.progressBarFill, { width: `${(score / 10) * 100}%`, backgroundColor: color }]} />
        </View>
      </View>
      <Text style={styles.skillScore}>{score}/10</Text>
    </View>
  );

  const renderList = (data) => {
    try {
      if (!data) return "N/A";
      if (Array.isArray(data)) return data.join(", ");
      if (typeof data === 'string' && data.includes(',')) {
        return data;
      }
      return data;
    } catch (err) {
      return "N/A";
    }
  };

  const parseSkills = (skillsData) => {
    if (!skillsData) return [];
    if (Array.isArray(skillsData)) return skillsData;
    if (typeof skillsData === 'string') {
      return skillsData.split(',').map(s => s.trim()).filter(s => s);
    }
    return [];
  };

  const renderEditableField = (label, fieldName, value, multiline = false) => {
    const isEditing = editingField === fieldName;

    return (
      <View style={styles.infoItem}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label}</Text>
          {!isEditing && (
            <TouchableOpacity onPress={() => handleEdit(fieldName, value)}>
              <Text style={styles.editIcon}>✏️</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {isEditing ? (
          <View>
            <TextInput
              style={[styles.input, multiline && styles.multilineInput]}
              value={editValue}
              onChangeText={setEditValue}
              multiline={multiline}
              placeholder={`Enter ${label.toLowerCase()}`}
            />
            <View style={styles.editActions}>
              <TouchableOpacity 
                style={styles.saveBtn} 
                onPress={() => handleSave(fieldName)}
                disabled={saving}
              >
                <Text style={styles.saveBtnText}>
                  {saving ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.cancelBtn} 
                onPress={handleCancel}
                disabled={saving}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <Text style={styles.value}>{value || "Not Listed"}</Text>
        )}
      </View>
    );
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#4F46E5" /></View>;

  const renderContent = () => (
    <>
      <View style={isDesktop ? styles.row : styles.column}>
        
        <View style={[styles.card, isDesktop ? { flex: 0.55, marginRight: 20 } : { marginBottom: 20 }]}>
          <View style={styles.cvHeader}>
             <View>
               <Text style={styles.cvTitle}>Trusted CV</Text>
               <Text style={styles.cvSubtitle}>Verified Candidate Profile</Text>
             </View>
             <View style={styles.verifiedBadge}><Text style={styles.verifiedText}>✓ Verified</Text></View>
          </View>
          <View style={styles.cvBody}>
             <View style={styles.cvProfileRow}>
               <TouchableOpacity onPress={pickImage} style={styles.avatarWrapper}>
                   {uploadingImg ? (
                       <View style={[styles.cvBigAvatar, styles.center]}>
                           <ActivityIndicator size="small" color="#4F46E5" />
                       </View>
                   ) : userData?.photoUrl ? (
                       <Image 
                         source={{ uri: userData.photoUrl }} 
                         style={styles.cvBigAvatar}
                       />
                   ) : (
                       <View style={[styles.cvBigAvatar, styles.emptyAvatar]}>
                           <Feather name="camera" size={24} color="#64748B" />
                           <Text style={styles.addPhotoText}>Add</Text>
                       </View>
                   )}
                   <View style={styles.avatarEditBadge}>
                       <Feather name="edit-2" size={10} color="#FFF" />
                   </View>
               </TouchableOpacity>
               <View style={styles.cvInfo}>
                 <View style={styles.labelRow}>
                   <Text style={styles.cvName}>{userData?.fullName || "Candidate Name"}</Text>
                   <TouchableOpacity onPress={() => handleEdit('fullName', userData?.fullName)}>
                       <Text style={styles.editIcon}>✏️</Text>
                   </TouchableOpacity>
                 </View>
                 {editingField === 'fullName' ? (
                   <View>
                     <TextInput
                       style={styles.input}
                       value={editValue}
                       onChangeText={setEditValue}
                       placeholder="Enter your name"
                     />
                     <View style={styles.editActions}>
                       <TouchableOpacity style={styles.saveBtn} onPress={() => handleSave('fullName')}>
                         <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save'}</Text>
                       </TouchableOpacity>
                       <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
                         <Text style={styles.cancelBtnText}>Cancel</Text>
                       </TouchableOpacity>
                     </View>
                   </View>
                 ) : null}
                 
                 <Text style={styles.cvRole}>{userData?.currentRole || userData?.status || "Job Seeker"}</Text>
                 <Text style={styles.cvExp}>Years Experience: {userData?.yearsOfExperience || "0"}</Text>
                 <View style={styles.cvTags}>
                    <Text style={styles.tag}>{userData?.location || "Location N/A"}</Text>
                 </View>
               </View>
             </View>
             {userData?.cvUrl && (
               <TouchableOpacity 
                 style={styles.downloadBtn}
                 onPress={() => {
                   if (Platform.OS === 'web') {
                     window.open(userData.cvUrl, '_blank');
                   }
                 }}
               >
                  <Text style={styles.downloadBtnText}>Download Full Resume</Text>
               </TouchableOpacity>
             )}
          </View>
        </View>
        <View style={[styles.card, styles.purpleCard, isDesktop ? { flex: 0.45 } : { marginBottom: 20 }]}>
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

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Career & Academic Profile</Text>
        <View style={styles.divider} />
        
        <View style={isDesktop ? styles.row : styles.column}>
          <View style={[isDesktop ? { flex: 0.4, borderRightWidth:1, borderColor:'#F1F5F9', paddingRight:20 } : { marginBottom:20 }]}>
            <Text style={styles.sectionHeader}>Education</Text>
            
            {renderEditableField("Institute", "institution", userData?.institution)}
            {renderEditableField("Degree", "degree", userData?.degree)}
            {renderEditableField("Education Level", "education", userData?.education)}
            {renderEditableField("Graduation Year", "graduationYear", userData?.graduationYear)}

            {/* CGPA */}
            <View style={styles.cgpaContainer}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>CGPA / 10</Text>
                {editingField !== 'cgpa' && (
                  <TouchableOpacity onPress={() => handleEdit('cgpa', userData?.cgpa)}>
                    <Text style={styles.editIcon}>✏️</Text>
                  </TouchableOpacity>
                )}
              </View>
              {editingField === 'cgpa' ? (
                <View style={{width: '100%'}}>
                  <TextInput
                    style={styles.input}
                    value={editValue}
                    onChangeText={setEditValue}
                    placeholder="Enter CGPA"
                    keyboardType="decimal-pad"
                  />
                  <View style={styles.editActions}>
                    <TouchableOpacity style={styles.saveBtn} onPress={() => handleSave('cgpa')}>
                      <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <>
                  <View style={styles.cgpaCircle}>
                    <Text style={styles.cgpaText}>{userData?.cgpa || "N/A"}</Text>
                  </View>
                  <Text style={{fontSize:10, color:'#64748B', marginTop:5}}>Cumulative Grade Point</Text>
                </>
              )}
            </View>
          </View>
          <View style={[isDesktop ? { flex: 0.6, paddingLeft:20 } : {}]}>
            <Text style={styles.sectionHeader}>Professional Details</Text>
            
            <View style={styles.detailGrid}>
              <View style={styles.detailBox}>
                {renderEditableField("Current Role", "currentRole", userData?.currentRole)}
              </View>
              <View style={styles.detailBox}>
                {renderEditableField("Experience (Years)", "yearsOfExperience", userData?.yearsOfExperience)}
              </View>
            </View>

            {renderEditableField("Work Experience", "workExperience", userData?.workExperience, true)}
            {renderEditableField("Projects", "projects", userData?.projects, true)}

            <View style={styles.infoItem}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Skills</Text>
                {editingField !== 'skills' && (
                  <TouchableOpacity onPress={() => handleEdit('skills', renderList(userData?.skills))}>
                    <Text style={styles.editIcon}>✏️</Text>
                  </TouchableOpacity>
                )}
              </View>
              {editingField === 'skills' ? (
                <View>
                  <TextInput
                    style={styles.input}
                    value={editValue}
                    onChangeText={setEditValue}
                    placeholder="Enter skills (comma separated)"
                    multiline
                  />
                  <View style={styles.editActions}>
                    <TouchableOpacity style={styles.saveBtn} onPress={() => handleSave('skills')}>
                      <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.chipContainer}>
                  {parseSkills(userData?.skills).length > 0 ? 
                    parseSkills(userData?.skills).map((s,i)=>(<Text key={i} style={styles.chip}>{s}</Text>)) 
                    : <Text style={styles.value}>N/A</Text>
                  }
                </View>
              )}
            </View>

            <View style={styles.row}>
              <View style={[styles.infoItem, {flex:1}]}>
                {renderEditableField("Certificates", "certifications", userData?.certifications)}
              </View>
              <View style={[styles.infoItem, {flex:1}]}>
                {renderEditableField("Achievements", "achievements", userData?.achievements)}
              </View>
            </View>

            {renderEditableField("Languages", "languages", userData?.languages)}
          </View>

        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.domainHeader}>
          <Text style={styles.cardTitle}>Domain Score</Text>
          <TouchableOpacity style={styles.dropdownBtn} onPress={() => setShowDomainPicker(true)}>
            <Text style={styles.dropdownText}>{selectedDomain} ▼</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.divider} />

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
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Dashboard</Text>
          {isProfileIncomplete() && (
            <Text style={styles.incompleteLabel}>⚠️ Setup Profile - Click ✏️ to edit</Text>
          )}
        </View>
        <Image 
          source={{ uri: userData?.photoUrl || 'https://via.placeholder.com/100' }} 
          style={styles.headerAvatar}
          onError={() => {}} 
        />
      </View>

      {isWeb ? (
        <div style={{ 
          height: '100vh', 
          width: '100%', 
          overflow: 'auto',
          WebkitOverflowScrolling: 'touch'
        }}>
          <View style={styles.scrollContent}>
            {renderContent()}
          </View>
        </div>
      ) : (
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
        >
          {renderContent()}
        </ScrollView>
      )}

      <Modal visible={showDomainPicker} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Domain</Text>
            <FlatList
              data={Object.keys(DOMAIN_CONFIG)}
              keyExtractor={item => item}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalItem} onPress={() => { setSelectedDomain(item); setShowDomainPicker(false); }}>
                  <Text style={[styles.modalText, item === selectedDomain && {color: '#4F46E5', fontWeight:'bold'}]}>{item}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowDomainPicker(false)}>
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
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    padding: 20,
    flexGrow: 1,
    minHeight: '100vh',
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  column: { flexDirection: 'column' },
  grid2Col: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10, backgroundColor: '#FFF' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#0F172A' },
  incompleteLabel: { fontSize: 11, color: '#F59E0B', marginTop: 4, fontWeight: '600' },
  headerAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E2E8F0' },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 24, marginBottom: 20, shadowColor: '#64748B', shadowOpacity: 0.08, shadowRadius: 10, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9' },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 16 },
  sectionHeader: { fontSize:16, fontWeight:'700', color:'#4F46E5', marginBottom:15, textTransform:'uppercase', letterSpacing:0.5 },
  infoItem: { marginBottom: 12 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  label: { fontSize: 12, color: '#64748B', fontWeight:'600' },
  editIcon: { fontSize: 14, marginLeft: 8 },
  value: { fontSize: 14, color: '#1E293B', lineHeight:20 },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    color: '#1E293B',
    backgroundColor: '#F8FAFC',
    marginTop: 4,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  saveBtn: {
    backgroundColor: '#4F46E5',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 6,
    flex: 1,
  },
  saveBtnText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 13,
    textAlign: 'center',
  },
  cancelBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 6,
    flex: 1,
  },
  cancelBtnText: {
    color: '#64748B',
    fontWeight: '600',
    fontSize: 13,
    textAlign: 'center',
  },
  detailGrid: { flexDirection: 'row', gap: 20, marginBottom: 15 },
  detailBox: { backgroundColor:'#F8FAFC', padding:10, borderRadius:8, flex:1 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop:4 },
  chip: { backgroundColor: '#EEF2FF', color: '#4F46E5', fontSize: 11, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12, fontWeight:'600' },
  cgpaContainer: { alignItems:'center', marginTop:20, backgroundColor:'#F0FDF4', padding:15, borderRadius:12 },
  cgpaCircle: { width: 80, height: 80, borderRadius: 40, borderWidth: 8, borderColor: '#22C55E', justifyContent: 'center', alignItems: 'center', backgroundColor:'#FFF' },
  cgpaText: { fontSize: 24, fontWeight: 'bold', color: '#15803D' },
  cvHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  cvTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B' },
  cvSubtitle: { fontSize: 12, color: '#64748B' },
  verifiedBadge: { backgroundColor: '#DCFCE7', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 20 },
  verifiedText: { color: '#166534', fontSize: 12, fontWeight: '700' },
  cvBody: {},
  cvProfileRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  cvBigAvatar: { width: 80, height: 80, borderRadius: 12, backgroundColor: '#CBD5E1' },
  emptyAvatar: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed' },
  addPhotoText: { fontSize: 10, color: '#64748B', marginTop: 4, fontWeight: '600' },
  avatarWrapper: { position: 'relative' },
  avatarEditBadge: { position: 'absolute', bottom: -5, right: -5, backgroundColor: '#4F46E5', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FFF' },

  cvInfo: { marginLeft: 16, flex: 1 },
  cvName: { fontSize: 20, fontWeight: 'bold', color: '#0F172A' },
  cvRole: { fontSize: 14, color: '#475569', marginBottom: 4 },
  cvExp: { fontSize: 12, color: '#64748B', marginBottom: 8 },
  cvTags: { flexDirection: 'row', gap: 6 },
  tag: { backgroundColor: '#F1F5F9', color: '#475569', fontSize: 10, paddingVertical: 2, paddingHorizontal: 6, borderRadius: 4 },
  downloadBtn: { backgroundColor: '#0F172A', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  downloadBtnText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
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
  skillLabel: { width: 140, fontSize: 13, color: '#475569', fontWeight: '500' },
  skillBarContainer: { flex: 1, marginHorizontal: 10 },
  progressBarBackground: { height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },
  skillScore: { width: 40, textAlign: 'right', fontSize: 13, color: '#64748B' },
  domainHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dropdownBtn: { backgroundColor: '#EEF2FF', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  dropdownText: { color: '#4F46E5', fontWeight: '600', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#FFF', width: 320, maxHeight: '60%', borderRadius: 12, padding: 20, shadowColor:'#000', shadowOpacity:0.25, shadowRadius:20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, textAlign: 'center', color: '#1E293B' },
  modalItem: { paddingVertical: 12, borderBottomWidth: 1, borderColor: '#F1F5F9' },
  modalText: { fontSize: 15, color: '#334155' },
  closeBtn: { marginTop: 16, backgroundColor: '#4F46E5', padding: 12, borderRadius: 8, alignItems: 'center' },
  closeBtnText: { color: '#FFF', fontWeight: '600' }
});