import React, { useRef, useEffect, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Animated,
    StatusBar,
    Platform,
    KeyboardAvoidingView,
    Alert,
    ActivityIndicator,
    Image, 
    useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import * as DocumentPicker from 'expo-document-picker';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { FIREBASE_Auth, FIREBASE_DB } from '../firebaseconfig';

const UNIVERSAL_PARAMS = [ "Communication", "Problem Understanding", "Problem Solving", "Domain Knowledge", "Behavioral", "Experience Depth", "Confidence", "Overall Fit" ];
const DOMAIN_CONFIG = { "Technical (Software)": [ "Coding Quality", "DSA / Algorithms", "Domain Knowledge", "Debugging Skills", "System Design", "Testing & Documentation", "API / DB Understanding" ], "Marketing & Brand": [ "Campaign Strategy", "Creativity & Content", "Market Research", "Target Audience", "Social Media Tools", "SEO/SEM", "Analytics", "Brand Consistency" ], "Sales & Business Dev": [ "Lead Qualification", "Pitch Quality", "Objection Handling", "Negotiation", "Relationship Building", "Sales Funnel", "CRM Tools", "Closing Ability" ], "Customer Support": [ "Empathy", "Problem Resolution", "Tone & Professionalism", "Incident Handling", "Support Tools", "Retention Skills", "Calm Under Pressure" ], "Human Resources (HR)": [ "Recruitment", "Screening", "Conflict Resolution", "Stakeholder Mgmt", "HR Policies", "Interviewing", "Employee Engagement" ], "Product Manager": [ "Product Thinking", "User Understanding", "Prioritization", "Roadmapping", "PRDs/Stories", "Stakeholder Comm", "Data-driven Decision", "Trade-offs" ], "Business Analyst": [ "Requirements", "Process Mapping", "User Stories", "Data Interpretation", "Documentation", "Stakeholder Comm", "Problem Breakdown", "Impact Analysis" ], "Finance": [ "Financial Modeling", "Statements", "Accuracy", "Compliance", "Budgeting", "Excel Proficiency", "Risk Assessment" ], "Operations": [ "Process Optimization", "SLA Mgmt", "Inventory", "Vendor Mgmt", "Cost Control", "Quality Assurance", "Escalation", "Workflow" ], "Management": [ "Team Leadership", "Decision Making", "Strategic Thinking", "Delegation", "Conflict Mgmt", "Performance Mgmt", "Vision & Planning" ], "Administrative": [ "Docs Handling", "Organization", "Email Etiquette", "Coordination", "Time Mgmt", "Software Tools" ], "UI/UX Design": [ "User Research", "Wireframing", "Visual Design", "Figma/Adobe", "Accessibility", "Portfolio", "Usability Testing" ], "Data Analyst": [ "SQL", "Data Cleaning", "Dashboarding", "Problem Framing", "ML Algorithms", "Storytelling", "KPIs" ] };

const AnimatedBackground = () => {
    const colorAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const startAnimation = () => {
            colorAnim.setValue(0);
            Animated.timing(colorAnim, {
                toValue: 1,
                duration: 15000,
                useNativeDriver: false,
            }).start(() => startAnimation());
        };
        startAnimation();
    }, [colorAnim]);

    const backgroundColor = colorAnim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: ['#F0F8FF', '#F5F5DC', '#F0F8FF'],
    });

    return (
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor, zIndex: -1 }]} />
    );
};

const ProfileCompletionForm = ({ navigation }) => {
    const [selectedFile, setSelectedFile] = useState(null); 
    const [profileImage, setProfileImage] = useState(null); 
    const [noCVMode, setNoCVMode] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [user, setUser] = useState(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(FIREBASE_Auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                try {
                    const docRef = doc(FIREBASE_DB, 'Profile', currentUser.uid);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                         if (navigation) navigation.replace('Home');
                    }
                } catch(e) { console.log(e); }
            }
        });
        return () => unsubscribe();
    }, []);
    useEffect(() => {
        return () => {
            if (Platform.OS === 'web' && profileImage?.uri) {
                try {
                    URL.revokeObjectURL(profileImage.uri);
                } catch (e) {
                    console.log('Failed to revoke object URL:', e);
                }
            }
        };
    }, [profileImage]);

    const [formData, setFormData] = useState({
        fullName: '', email: '', status: '', phone: '', location: '', linkedin: '', portfolio: ''
    });
    
    const [cvData, setCvData] = useState({
        education: '', 
        degree: '', 
        institution: '', 
        graduationYear: '',
        cgpa: '',
        workExperience: '', 
        currentRole: '', 
        yearsOfExperience: '',
        skills: '', 
        certifications: '', 
        projects: '', 
        languages: '', 
        achievements: ''
    });

    const pickImage = async () => {
        try {
            if (Platform.OS === 'web') {
                if (profileImage?.uri) {
                    try {
                        URL.revokeObjectURL(profileImage.uri);
                    } catch (e) {
                        console.log('Failed to revoke previous URL:', e);
                    }
                }

                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/jpeg,image/jpg,image/png,image/gif,image/webp';
                input.onchange = (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        if (file.size > 5 * 1024 * 1024) {
                            Alert.alert('Error', 'Image size must be less than 5MB');
                            return;
                        }

                        if (!file.type.startsWith('image/')) {
                            Alert.alert('Error', 'Please select a valid image file');
                            return;
                        }

                        const objectUrl = URL.createObjectURL(file);
                        setProfileImage({
                            name: file.name,
                            file: file,
                            uri: objectUrl,
                            type: file.type
                        });
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
                    if (file.size && file.size > 5 * 1024 * 1024) {
                        Alert.alert('Error', 'Image size must be less than 5MB');
                        return;
                    }

                    setProfileImage({
                        name: file.name,
                        uri: file.uri,
                        mimeType: file.mimeType || 'image/jpeg'
                    });
                }
            }
        } catch (err) {
            console.error('Image picker error:', err);
            Alert.alert('Error', 'Failed to pick image. Please try again.');
        }
    };

    const removeProfileImage = () => {
        if (Platform.OS === 'web' && profileImage?.uri) {
            try {
                URL.revokeObjectURL(profileImage.uri);
            } catch (e) {
                console.log('Failed to revoke URL:', e);
            }
        }
        setProfileImage(null);
    };

    const pickDocument = async () => {
        try {
            if (Platform.OS === 'web') {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.pdf,.doc,.docx';
                input.onchange = (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        if (file.size > 10 * 1024 * 1024) return Alert.alert('Error', 'File > 10MB');
                        setSelectedFile({ name: file.name, size: file.size, type: file.type, file: file });
                    }
                };
                input.click();
            } else {
                const result = await DocumentPicker.getDocumentAsync({
                    type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
                    copyToCacheDirectory: true
                });
                if (!result.canceled && result.assets) {
                    const file = result.assets[0];
                    if (file.size > 10 * 1024 * 1024) return Alert.alert('Error', 'File > 10MB');
                    setSelectedFile({ name: file.name, size: file.size, type: file.mimeType, uri: file.uri });
                }
            }
        } catch (err) {
            Alert.alert('Error', `Failed to pick document: ${err.message}`);
        }
    };

    const removeFile = () => setSelectedFile(null);
    const toggleNoCVMode = () => { if(!noCVMode) setSelectedFile(null); setNoCVMode(!noCVMode); };
    const formatFileSize = (bytes) => { if(bytes===0)return'0 B';const k=1024;const s=['B','KB','MB'];const i=Math.floor(Math.log(bytes)/Math.log(k));return Math.round(bytes/Math.pow(k,i)*100)/100+' '+s[i]; };

    const handleSubmit = async () => {
        if (!user) return Alert.alert('Error', 'No user logged in.');
        if (!formData.fullName || !formData.email || !formData.phone) return Alert.alert('Error', 'Please fill basic fields.');
        if (!noCVMode && !selectedFile) return Alert.alert('Error', 'Upload CV or select manual mode.');
        if (noCVMode && (!cvData.education || !cvData.skills)) return Alert.alert('Error', 'Fill required CV fields.');

        setUploading(true);

        try {
            let cvUrl = "";
            let photoUrl = "";
            const storage = getStorage();
            if (!noCVMode && selectedFile) {
                try {
                    const cvRef = storageRef(storage, `cvs/${user.uid}_${Date.now()}_${selectedFile.name}`);
                    let cvBlob;
                    if (Platform.OS === 'web') {
                        cvBlob = selectedFile.file;
                    } else {
                        const r = await fetch(selectedFile.uri);
                        cvBlob = await r.blob();
                    }
                    await uploadBytes(cvRef, cvBlob);
                    cvUrl = await getDownloadURL(cvRef);
                } catch (e) { 
                    console.error("CV Upload error", e);
                    throw new Error('Failed to upload CV');
                }
            }
            
            if (profileImage) {
                try {
                    const timestamp = Date.now();
                    const fileName = `${user.uid}_${timestamp}.jpg`;
                    const photoRef = storageRef(storage, `profile_photos/${fileName}`);
                    
                    let photoBlob;
                    if (Platform.OS === 'web') {
                        photoBlob = profileImage.file;
                    } else {
                        const response = await fetch(profileImage.uri);
                        photoBlob = await response.blob();
                    }
                    
                    const metadata = {
                        contentType: profileImage.type || profileImage.mimeType || 'image/jpeg',
                    };
                    
                    await uploadBytes(photoRef, photoBlob, metadata);
                    photoUrl = await getDownloadURL(photoRef);
                } catch (e) { 
                    console.error("Photo Upload error", e);
                    Alert.alert('Warning', 'Profile photo upload failed, but profile will be saved without it.');
                }
            }
            
            const initialUniversalScores = {};
            UNIVERSAL_PARAMS.forEach(p => initialUniversalScores[p] = 0);
            const initialDomainScores = {};
            Object.keys(DOMAIN_CONFIG).forEach(d => {
                initialDomainScores[d] = {};
                DOMAIN_CONFIG[d].forEach(s => initialDomainScores[d][s] = 0);
            });
            
            const profileData = {
                userID: user.uid,
                email: user.email,
                fullName: formData.fullName,
                status: formData.status,
                phone: formData.phone,
                location: formData.location,
                linkedin: formData.linkedin,
                portfolio: formData.portfolio,
                
                photoUrl: photoUrl || "",
                
                cvMode: noCVMode ? 'manual' : 'uploaded',
                cvUrl: cvUrl || "",
                
                education: cvData.education,
                degree: cvData.degree,
                institution: cvData.institution,
                graduationYear: cvData.graduationYear,
                cgpa: cvData.cgpa,
                workExperience: cvData.workExperience,
                currentRole: cvData.currentRole,
                yearsOfExperience: cvData.yearsOfExperience,
                skills: cvData.skills,
                certifications: cvData.certifications,
                projects: cvData.projects,
                languages: cvData.languages,
                achievements: cvData.achievements,
                
                universalscore: initialUniversalScores,
                Domainspecificscore: initialDomainScores,
                avgScore: 0.0,
                
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            const profileRef = doc(FIREBASE_DB, 'Profile', user.uid);
            await setDoc(profileRef, profileData, { merge: true });
            if (Platform.OS === 'web' && profileImage?.uri) {
                try {
                    URL.revokeObjectURL(profileImage.uri);
                } catch (e) {
                    console.log('Cleanup error:', e);
                }
            }

            setUploading(false);
            if (Platform.OS === 'web') {
                if(navigation) navigation.replace('Home');
                else window.location.reload();
            } else {
                Alert.alert('Success', 'Profile saved!', [{ text: 'OK', onPress: () => navigation.replace('Home') }]);
            }

        } catch (error) {
            setUploading(false);
            Alert.alert('Error', error.message || 'Failed to save profile');
        }
    };

    return (
        <View style={styles.formContainer}>
            <View style={styles.photoContainer}>
                <TouchableOpacity onPress={pickImage} style={styles.photoWrapper}>
                    {profileImage ? (
                        <>
                            <Image 
                                source={{ uri: profileImage.uri }} 
                                style={styles.profileImage}
                                resizeMode="cover"
                            />
                            <TouchableOpacity 
                                onPress={removeProfileImage} 
                                style={styles.removePhotoBadge}
                            >
                                <Feather name="x" size={12} color="#FFF" />
                            </TouchableOpacity>
                        </>
                    ) : (
                        <View style={styles.iconCircle}>
                            <Feather name="camera" size={30} color="#7B68EE" />
                        </View>
                    )}
                    <View style={styles.editBadge}>
                        <Feather name="edit-2" size={12} color="#FFF" />
                    </View>
                </TouchableOpacity>
                <Text style={styles.photoText}>
                    {profileImage ? 'Change Photo' : 'Upload Photo'}
                </Text>
                {profileImage && (
                    <Text style={styles.photoHint}>{profileImage.name}</Text>
                )}
            </View>

            <Text style={styles.headerTitle}>Complete Your Profile</Text>
            <Text style={styles.headerSubtitle}>
                Let's get started by filling in your details and uploading your CV
            </Text>

            <View style={styles.contentContainer}>
                <Text style={styles.sectionTitle}>Basic Information</Text>

                <Text style={styles.label}>Full Name *</Text>
                <TextInput
                    style={styles.fullWidthInput}
                    placeholder="Enter your full name"
                    placeholderTextColor="#999"
                    value={formData.fullName}
                    onChangeText={(text) => setFormData({...formData, fullName: text})}
                />

                <Text style={styles.label}>Email Address *</Text>
                <TextInput
                    style={styles.fullWidthInput}
                    placeholder="your.email@example.com"
                    value={formData.email}
                    onChangeText={(text) => setFormData({...formData, email: text})}
                    keyboardType="email-address"
                    autoCapitalize="none"
                />

                <Text style={styles.label}>Status</Text>
                <TextInput
                    style={styles.fullWidthInput}
                    placeholder="In college / Employed / Unemployed"
                    value={formData.status}
                    onChangeText={(text) => setFormData({...formData, status: text})}
                />

                <Text style={styles.label}>Phone Number *</Text>
                <TextInput
                    style={styles.fullWidthInput}
                    placeholder="+1 (555) 000-0000"
                    keyboardType="phone-pad"
                    value={formData.phone}
                    onChangeText={(text) => setFormData({...formData, phone: text})}
                />

                <View style={styles.row}>
                    <View style={styles.rowItem}>
                        <Text style={styles.label}>Location</Text>
                        <TextInput
                            style={styles.fullWidthInput}
                            placeholder="City, Country"
                            value={formData.location}
                            onChangeText={(text) => setFormData({...formData, location: text})}
                        />
                    </View>
                    <View style={[styles.rowItem, { marginLeft: 15 }]}>
                        <Text style={styles.label}>LinkedIn</Text>
                        <TextInput
                            style={styles.fullWidthInput}
                            placeholder="linkedin.com/in/..."
                            value={formData.linkedin}
                            onChangeText={(text) => setFormData({...formData, linkedin: text})}
                            autoCapitalize="none"
                        />
                    </View>
                </View>

                <Text style={styles.label}>Portfolio/Website</Text>
                <TextInput
                    style={styles.fullWidthInput}
                    placeholder="yourportfolio.com"
                    value={formData.portfolio}
                    onChangeText={(text) => setFormData({...formData, portfolio: text})}
                    autoCapitalize="none"
                />

                <Text style={[styles.sectionTitle, { marginTop: 25 }]}>Upload Your CV *</Text>
                
                <TouchableOpacity style={styles.checkboxContainer} onPress={toggleNoCVMode}>
                    <View style={[styles.checkbox, noCVMode && styles.checkboxChecked]}>
                        {noCVMode && <Feather name="check" size={16} color="#FFF" />}
                    </View>
                    <Text style={styles.checkboxLabel}>I don't have a CV (Fill details manually)</Text>
                </TouchableOpacity>

                {!noCVMode ? (
                    <>
                        {!selectedFile ? (
                            <TouchableOpacity style={styles.uploadBox} onPress={pickDocument}>
                                <Feather name="upload-cloud" size={40} color="#7B68EE" />
                                <Text style={styles.uploadText}>Tap to browse and upload your CV</Text>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.filePreview}>
                                <View style={styles.fileInfo}>
                                    <Feather name="file-text" size={24} color="#7B68EE" />
                                    <View style={styles.fileDetails}>
                                        <Text style={styles.fileName}>{selectedFile.name}</Text>
                                        <Text style={styles.fileSize}>{formatFileSize(selectedFile.size)}</Text>
                                    </View>
                                </View>
                                <TouchableOpacity onPress={removeFile} style={styles.removeButton}>
                                    <Feather name="x" size={20} color="#FF4444" />
                                </TouchableOpacity>
                            </View>
                        )}
                    </>
                ) : (
                    <View style={styles.cvManualSection}>
                        <Text style={styles.cvManualHeader}>Professional Information</Text>
                        
                        <Text style={styles.label}>Highest Education Level *</Text>
                        <TextInput 
                            style={styles.fullWidthInput} 
                            placeholder="e.g. Bachelors, Masters, PhD" 
                            value={cvData.education} 
                            onChangeText={(t)=>setCvData({...cvData, education:t})} 
                        />
                        
                        <View style={styles.row}>
                            <View style={styles.rowItem}>
                                <Text style={styles.label}>Degree</Text>
                                <TextInput 
                                    style={styles.fullWidthInput} 
                                    placeholder="e.g. B.Tech CS" 
                                    value={cvData.degree} 
                                    onChangeText={(t)=>setCvData({...cvData, degree:t})} 
                                />
                            </View>
                            <View style={[styles.rowItem, {marginLeft:15}]}>
                                <Text style={styles.label}>Grad Year</Text>
                                <TextInput 
                                    style={styles.fullWidthInput} 
                                    placeholder="2024" 
                                    value={cvData.graduationYear} 
                                    onChangeText={(t)=>setCvData({...cvData, graduationYear:t})} 
                                    keyboardType="numeric" 
                                />
                            </View>
                        </View>
                        
                        <Text style={styles.label}>Institute</Text>
                        <TextInput 
                            style={styles.fullWidthInput} 
                            placeholder="University/College Name" 
                            value={cvData.institution} 
                            onChangeText={(t)=>setCvData({...cvData, institution:t})} 
                        />
                        
                        <View style={styles.row}>
                            <View style={[styles.rowItem, { flex: 1.5 }]}>
                                <Text style={styles.label}>CGPA/Percentage</Text>
                                <TextInput 
                                    style={styles.fullWidthInput} 
                                    placeholder="e.g. 8.5 or 85%" 
                                    value={cvData.cgpa} 
                                    onChangeText={(t)=>setCvData({...cvData, cgpa:t})} 
                                    keyboardType="decimal-pad"
                                />
                            </View>
                        </View>
                        
                        <Text style={styles.label}>Current Role</Text>
                        <TextInput 
                            style={styles.fullWidthInput} 
                            placeholder="e.g. Software Engineer, Student" 
                            value={cvData.currentRole} 
                            onChangeText={(t)=>setCvData({...cvData, currentRole:t})} 
                        />
                        
                        <Text style={styles.label}>Skills *</Text>
                        <TextInput 
                            style={[styles.fullWidthInput, styles.textArea]} 
                            placeholder="e.g. React Native, Python, JavaScript, Firebase..."
                            value={cvData.skills} 
                            onChangeText={(t)=>setCvData({...cvData, skills:t})}
                            multiline
                            numberOfLines={3}
                        />
                    </View>
                )}

                <TouchableOpacity 
                    style={[styles.button, uploading && styles.buttonDisabled]} 
                    onPress={handleSubmit}
                    disabled={uploading}
                >
                    {uploading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Complete Profile</Text>}
                </TouchableOpacity>

                <Text style={styles.securityNote}>
                    Your information is secure and will only be used for interview purposes
                </Text>
            </View>
        </View>
    );
};

export default function Profile({ navigation }) {
    const isWeb = Platform.OS === 'web';
    if (isWeb) {
        return (
            <View style={styles.webContainer}>
                <StatusBar barStyle="dark-content" backgroundColor="#f6f7fa" />
                <AnimatedBackground />
                <div style={{ height: '100vh', width: '100%', overflow: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    <View style={styles.mainScrollContainer}>
                        <ProfileCompletionForm navigation={navigation} />
                    </View>
                </div>
            </View>
        );
    }
    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#f6f7fa" />
            <AnimatedBackground />
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.mainScrollContainer} showsVerticalScrollIndicator={true}>
                    <ProfileCompletionForm navigation={navigation} />
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    webContainer: { flex: 1, height: '100vh', width: '100%', position: 'relative' },
    mainScrollContainer: { flexGrow: 1, alignItems: 'center', paddingVertical: 40 },
    formContainer: { width: '90%', maxWidth: 600, backgroundColor: '#FFFFFF', borderRadius: 20, padding: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 15, elevation: 5, marginBottom: 20 },

    photoContainer: { alignItems: 'center', marginBottom: 20 },
    photoWrapper: { position: 'relative' },
    profileImage: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: '#E6E6FA' },
    iconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#E6E6FA', justifyContent: 'center', alignItems: 'center' },
    editBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#4F46E5', width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
    removePhotoBadge: { position: 'absolute', top: 0, right: 0, backgroundColor: '#FF4444', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
    photoText: { marginTop: 8, color: '#4F46E5', fontWeight: '600', fontSize: 14 },
    photoHint: { marginTop: 4, color: '#999', fontSize: 11, maxWidth: 200, textAlign: 'center' },

    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#333', textAlign: 'center' },
    headerSubtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 30 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 10 },
    subsectionTitle: { fontSize: 16, fontWeight: '600', color: '#7B68EE', marginBottom: 10, marginTop: 10 },
    label: { fontSize: 13, color: '#333', marginBottom: 5, marginTop: 15 },
    fullWidthInput: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 15, height: 45, backgroundColor: '#FAFAFA', fontSize: 16, color: '#333' },
    textArea: { height: 'auto', minHeight: 80, paddingTop: 12, paddingBottom: 12, textAlignVertical: 'top' },
    inputIconGroup: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 10, height: 45, backgroundColor: '#FAFAFA' },
    inputIcon: { marginRight: 10 },
    inputWithIcon: { flex: 1, fontSize: 16, paddingVertical: 0, color: '#333' },
    row: { flexDirection: 'row', justifyContent: 'space-between' },
    rowItem: { flex: 1 },
    checkboxContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 15 },
    checkbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: '#7B68EE', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    checkboxChecked: { backgroundColor: '#7B68EE' },
    checkboxLabel: { fontSize: 14, color: '#333', flex: 1 },
    uploadBox: { borderWidth: 2, borderColor: '#D3D3D3', borderStyle: 'dashed', borderRadius: 10, padding: 30, alignItems: 'center', backgroundColor: '#F8F8FF', marginTop: 10 },
    uploadText: { fontSize: 16, color: '#7B68EE', marginTop: 10, fontWeight: '600' },
    uploadHint: { fontSize: 12, color: '#999', marginTop: 5 },
    filePreview: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, padding: 15, backgroundColor: '#F8F8FF', marginTop: 10 },
    fileInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    fileDetails: { marginLeft: 12, flex: 1 },
    fileName: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 2 },
    fileSize: { fontSize: 12, color: '#666' },
    removeButton: { padding: 5 },
    cvManualSection: { backgroundColor: '#F8F8FF', borderRadius: 10, padding: 20, marginTop: 10, borderWidth: 1, borderColor: '#E6E6FA' },
    cvManualHeader: { fontSize: 16, fontWeight: '600', color: '#7B68EE', marginBottom: 15 },
    button: { backgroundColor: '#7B68EE', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 30 },
    buttonDisabled: { backgroundColor: '#B0A8E8', opacity: 0.7 },
    buttonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
    securityNote: { fontSize: 12, color: '#999', textAlign: 'center', marginTop: 20 },
});
