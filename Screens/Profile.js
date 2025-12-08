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
    ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import * as DocumentPicker from 'expo-document-picker';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { FIREBASE_Auth, FIREBASE_DB } from '../firebaseconfig';

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
        outputRange: [
            '#F0F8FF',
            '#F5F5DC',
            '#F0F8FF',
        ],
    });

    return (
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor }]} />
    );
};

const ProfileCompletionForm = ({ navigation }) => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [noCVMode, setNoCVMode] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        status: '',
        phone: '',
        location: '',
        linkedin: '',
        portfolio: ''
    });
    
    const [cvData, setCvData] = useState({
        education: '',
        degree: '',
        institution: '',
        graduationYear: '',
        workExperience: '',
        currentRole: '',
        yearsOfExperience: '',
        skills: '',
        certifications: '',
        projects: '',
        languages: '',
        achievements: ''
    });

    const pickDocument = async () => {
        try {
            if (Platform.OS === 'web') {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.pdf,.doc,.docx';
                input.id = 'cv-upload-input';
                input.name = 'cv-upload';
                input.onchange = (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        if (file.size > 10 * 1024 * 1024) {
                            Alert.alert('Error', 'File size must be less than 10MB');
                            return;
                        }
                        setSelectedFile({
                            name: file.name,
                            size: file.size,
                            type: file.type,
                            file: file
                        });
                    }
                };
                input.click();
            } else {
                const result = await DocumentPicker.getDocumentAsync({
                    type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
                    copyToCacheDirectory: true,
                    multiple: false,
                });

                console.log('Document picker result:', result);

                if (result.canceled === false && result.assets && result.assets.length > 0) {
                    const file = result.assets[0];
                    
                    if (file.size > 10 * 1024 * 1024) {
                        Alert.alert('Error', 'File size must be less than 10MB');
                        return;
                    }
                    
                    setSelectedFile({
                        name: file.name,
                        size: file.size,
                        type: file.mimeType || 'application/pdf',
                        uri: file.uri
                    });
                    
                    Alert.alert('Success', `File "${file.name}" uploaded successfully!`);
                }
            }
        } catch (err) {
            console.error('Error picking document:', err);
            Alert.alert('Error', `Failed to pick document: ${err.message}`);
        }
    };

    const removeFile = () => {
        setSelectedFile(null);
    };

    const toggleNoCVMode = () => {
        if (!noCVMode) {
            setSelectedFile(null);
        }
        setNoCVMode(!noCVMode);
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    const handleSubmit = async () => {
        if (!formData.fullName || !formData.email || !formData.phone) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }
        
        if (!noCVMode && !selectedFile) {
            Alert.alert('Error', 'Please upload your CV or select "I don\'t have a CV"');
            return;
        }

        if (noCVMode) {
            if (!cvData.education || !cvData.degree || !cvData.skills) {
                Alert.alert('Error', 'Please fill in required CV information fields');
                return;
            }
        }

        setUploading(true);

        try {
            const user = FIREBASE_Auth.currentUser;
            if (!user) {
                Alert.alert('Error', 'No user logged in');
                setUploading(false);
                return;
            }
            let cvUrl = null;
            if (!noCVMode && selectedFile && !selectedFile.placeholder) {
                try {
                    const storage = getStorage();
                    const fileName = `cvs/${user.uid}_${Date.now()}_${selectedFile.name}`;
                    const fileRef = storageRef(storage, fileName);

                    let fileBlob;
                    if (Platform.OS === 'web') {
                        fileBlob = selectedFile.file;
                    } else {
                        const response = await fetch(selectedFile.uri);
                        fileBlob = await response.blob();
                    }

                    await uploadBytes(fileRef, fileBlob);
                    cvUrl = await getDownloadURL(fileRef);
                } catch (uploadError) {
                    console.error('Error uploading CV:', uploadError);
                    Alert.alert('Warning', 'CV upload failed, but profile will be saved without it.');
                }
            }
            const profileData = {
                userID: user.uid,
                email: user.email,
                basicInfo: {
                    fullName: formData.fullName,
                    email: formData.email,
                    status: formData.status,
                    phone: formData.phone,
                    location: formData.location,
                    linkedin: formData.linkedin,
                    portfolio: formData.portfolio,
                },
                cvMode: noCVMode ? 'manual' : 'uploaded',
                cvUrl: cvUrl,
                cvData: noCVMode ? {
                    education: cvData.education,
                    degree: cvData.degree,
                    institution: cvData.institution,
                    graduationYear: cvData.graduationYear,
                    workExperience: cvData.workExperience,
                    currentRole: cvData.currentRole,
                    yearsOfExperience: cvData.yearsOfExperience,
                    skills: cvData.skills,
                    certifications: cvData.certifications,
                    projects: cvData.projects,
                    languages: cvData.languages,
                    achievements: cvData.achievements,
                } : null,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };
            const profileRef = doc(FIREBASE_DB, 'Profile', user.uid);
            await setDoc(profileRef, profileData, { merge: true });

            setUploading(false);
            Alert.alert('Success', 'Profile saved successfully!', [
                {
                    text: 'OK',
                    onPress: () => {
                        if (navigation) {
                            navigation.navigate('Home');
                        }
                    }
                }
            ]);

        } catch (error) {
            console.error('Error saving profile:', error);
            setUploading(false);
            Alert.alert('Error', `Failed to save profile: ${error.message}`);
        }
    };

    return (
        <View style={styles.formContainer}>
            <View style={styles.iconCircle}>
                <Feather name="briefcase" size={32} color="#7B68EE" />
            </View>

            <Text style={styles.headerTitle}>Complete Your Profile</Text>
            <Text style={styles.headerSubtitle}>
                Let's get started by filling in your details and uploading your CV
            </Text>

            <View style={styles.contentContainer}>
                <Text style={styles.sectionTitle}>Basic Information</Text>

                <Text style={styles.label} nativeID="fullname-label">Full Name *</Text>
                <TextInput
                    style={styles.fullWidthInput}
                    placeholder="Enter your full name"
                    placeholderTextColor="#999"
                    value={formData.fullName}
                    onChangeText={(text) => setFormData({...formData, fullName: text})}
                    nativeID="fullname-input"
                    accessibilityLabel="Full Name"
                />

                <Text style={styles.label} nativeID="email-label">Email Address *</Text>
                <TextInput
                    style={styles.fullWidthInput}
                    placeholder="your.email@example.com"
                    keyboardType="email-address"
                    placeholderTextColor="#999"
                    value={formData.email}
                    onChangeText={(text) => setFormData({...formData, email: text})}
                    autoCapitalize="none"
                    nativeID="email-input"
                    accessibilityLabel="Email Address"
                />

                <Text style={styles.label} nativeID="status-label">Status</Text>
                <TextInput
                    style={styles.fullWidthInput}
                    placeholder="In college / Employed / Unemployed"
                    keyboardType="default"
                    placeholderTextColor="#999"
                    value={formData.status}
                    onChangeText={(text) => setFormData({...formData, status: text})}
                    nativeID="status-input"
                    accessibilityLabel="Status"
                />

                <Text style={styles.label} nativeID="phone-label">Phone Number *</Text>
                <TextInput
                    style={styles.fullWidthInput}
                    placeholder="+1 (555) 000-0000"
                    keyboardType="phone-pad"
                    placeholderTextColor="#999"
                    value={formData.phone}
                    onChangeText={(text) => setFormData({...formData, phone: text})}
                    nativeID="phone-input"
                    accessibilityLabel="Phone Number"
                />

                <View style={styles.row}>
                    <View style={styles.rowItem}>
                        <Text style={styles.label} nativeID="location-label">Location</Text>
                        <View style={styles.inputIconGroup}>
                            <Feather name="map-pin" size={18} color="#999" style={styles.inputIcon} />
                            <TextInput
                                style={styles.inputWithIcon}
                                placeholder="City, Country"
                                placeholderTextColor="#999"
                                value={formData.location}
                                onChangeText={(text) => setFormData({...formData, location: text})}
                                nativeID="location-input"
                                accessibilityLabel="Location"
                            />
                        </View>
                    </View>
                    <View style={[styles.rowItem, { marginLeft: 15 }]}>
                        <Text style={styles.label} nativeID="linkedin-label">LinkedIn Profile</Text>
                        <View style={styles.inputIconGroup}>
                            <FontAwesome name="linkedin" size={18} color="#0077B5" style={styles.inputIcon} />
                            <TextInput
                                style={styles.inputWithIcon}
                                placeholder="linkedin.com/in/yourprofile"
                                autoCapitalize="none"
                                placeholderTextColor="#999"
                                value={formData.linkedin}
                                onChangeText={(text) => setFormData({...formData, linkedin: text})}
                                nativeID="linkedin-input"
                                accessibilityLabel="LinkedIn Profile"
                            />
                        </View>
                    </View>
                </View>

                <Text style={styles.label} nativeID="portfolio-label">Portfolio/Website</Text>
                <View style={styles.inputIconGroup}>
                    <MaterialCommunityIcons name="web" size={18} color="#999" style={styles.inputIcon} />
                    <TextInput
                        style={styles.inputWithIcon}
                        placeholder="yourportfolio.com"
                        autoCapitalize="none"
                        placeholderTextColor="#999"
                        value={formData.portfolio}
                        onChangeText={(text) => setFormData({...formData, portfolio: text})}
                        nativeID="portfolio-input"
                        accessibilityLabel="Portfolio Website"
                    />
                </View>

                <Text style={[styles.sectionTitle, { marginTop: 25 }]}>Upload Your CV *</Text>
                
                <TouchableOpacity 
                    style={styles.checkboxContainer} 
                    onPress={toggleNoCVMode}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: noCVMode }}
                >
                    <View style={[styles.checkbox, noCVMode && styles.checkboxChecked]}>
                        {noCVMode && <Feather name="check" size={16} color="#FFF" />}
                    </View>
                    <Text style={styles.checkboxLabel}>I don't have a CV (Fill details manually)</Text>
                </TouchableOpacity>

                {!noCVMode ? (
                    <>
                        {!selectedFile ? (
                            <TouchableOpacity 
                                style={styles.uploadBox} 
                                onPress={pickDocument}
                                accessibilityLabel="Upload CV"
                                accessibilityRole="button"
                            >
                                <Feather name="upload-cloud" size={40} color="#7B68EE" />
                                <Text style={styles.uploadText}>
                                    Tap to browse and upload your CV
                                </Text>
                                <Text style={styles.uploadHint}>
                                    Supports PDF, DOC, DOCX (Max 10MB)
                                </Text>
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
                                <TouchableOpacity 
                                    onPress={removeFile} 
                                    style={styles.removeButton}
                                    accessibilityLabel="Remove uploaded file"
                                    accessibilityRole="button"
                                >
                                    <Feather name="x" size={20} color="#FF4444" />
                                </TouchableOpacity>
                            </View>
                        )}
                    </>
                ) : (
                    <View style={styles.cvManualSection}>
                        <Text style={styles.cvManualHeader}>
                            <Feather name="edit" size={16} color="#7B68EE" /> Professional Information
                        </Text>
                        
                        <Text style={styles.subsectionTitle}>Education</Text>
                        
                        <Text style={styles.label}>Highest Education Level *</Text>
                        <TextInput
                            style={styles.fullWidthInput}
                            placeholder="e.g., Bachelor's, Master's, PhD"
                            placeholderTextColor="#999"
                            value={cvData.education}
                            onChangeText={(text) => setCvData({...cvData, education: text})}
                        />

                        <View style={styles.row}>
                            <View style={styles.rowItem}>
                                <Text style={styles.label}>Degree/Field of Study *</Text>
                                <TextInput
                                    style={styles.fullWidthInput}
                                    placeholder="e.g., Computer Science"
                                    placeholderTextColor="#999"
                                    value={cvData.degree}
                                    onChangeText={(text) => setCvData({...cvData, degree: text})}
                                />
                            </View>
                            <View style={[styles.rowItem, { marginLeft: 15 }]}>
                                <Text style={styles.label}>Graduation Year</Text>
                                <TextInput
                                    style={styles.fullWidthInput}
                                    placeholder="e.g., 2024"
                                    keyboardType="numeric"
                                    placeholderTextColor="#999"
                                    value={cvData.graduationYear}
                                    onChangeText={(text) => setCvData({...cvData, graduationYear: text})}
                                />
                            </View>
                        </View>

                        <Text style={styles.label}>Institution/University</Text>
                        <TextInput
                            style={styles.fullWidthInput}
                            placeholder="Name of your institution"
                            placeholderTextColor="#999"
                            value={cvData.institution}
                            onChangeText={(text) => setCvData({...cvData, institution: text})}
                        />
                        <Text style={[styles.subsectionTitle, { marginTop: 20 }]}>Work Experience</Text>
                        
                        <Text style={styles.label}>Current/Recent Role</Text>
                        <TextInput
                            style={styles.fullWidthInput}
                            placeholder="e.g., Software Developer, Student"
                            placeholderTextColor="#999"
                            value={cvData.currentRole}
                            onChangeText={(text) => setCvData({...cvData, currentRole: text})}
                        />

                        <Text style={styles.label}>Years of Experience</Text>
                        <TextInput
                            style={styles.fullWidthInput}
                            placeholder="e.g., 2 years, 6 months, Fresher"
                            placeholderTextColor="#999"
                            value={cvData.yearsOfExperience}
                            onChangeText={(text) => setCvData({...cvData, yearsOfExperience: text})}
                        />

                        <Text style={styles.label}>Work Experience Summary</Text>
                        <TextInput
                            style={[styles.fullWidthInput, styles.textArea]}
                            placeholder="Briefly describe your work experience and responsibilities"
                            placeholderTextColor="#999"
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                            value={cvData.workExperience}
                            onChangeText={(text) => setCvData({...cvData, workExperience: text})}
                        />

                        <Text style={[styles.subsectionTitle, { marginTop: 20 }]}>Skills & Expertise</Text>
                        
                        <Text style={styles.label}>Technical Skills *</Text>
                        <TextInput
                            style={[styles.fullWidthInput, styles.textArea]}
                            placeholder="e.g., JavaScript, Python, React, Data Analysis (separate with commas)"
                            placeholderTextColor="#999"
                            multiline
                            numberOfLines={3}
                            textAlignVertical="top"
                            value={cvData.skills}
                            onChangeText={(text) => setCvData({...cvData, skills: text})}
                        />

                        <Text style={styles.label}>Certifications</Text>
                        <TextInput
                            style={[styles.fullWidthInput, styles.textArea]}
                            placeholder="List any relevant certifications (optional)"
                            placeholderTextColor="#999"
                            multiline
                            numberOfLines={2}
                            textAlignVertical="top"
                            value={cvData.certifications}
                            onChangeText={(text) => setCvData({...cvData, certifications: text})}
                        />

                        <Text style={[styles.subsectionTitle, { marginTop: 20 }]}>Additional Information</Text>
                        
                        <Text style={styles.label}>Projects/Achievements</Text>
                        <TextInput
                            style={[styles.fullWidthInput, styles.textArea]}
                            placeholder="Describe notable projects or achievements"
                            placeholderTextColor="#999"
                            multiline
                            numberOfLines={3}
                            textAlignVertical="top"
                            value={cvData.projects}
                            onChangeText={(text) => setCvData({...cvData, projects: text})}
                        />

                        <Text style={styles.label}>Languages</Text>
                        <TextInput
                            style={styles.fullWidthInput}
                            placeholder="e.g., English (Fluent), Spanish (Intermediate)"
                            placeholderTextColor="#999"
                            value={cvData.languages}
                            onChangeText={(text) => setCvData({...cvData, languages: text})}
                        />
                    </View>
                )}

                <TouchableOpacity 
                    style={[styles.button, uploading && styles.buttonDisabled]} 
                    onPress={handleSubmit}
                    accessibilityLabel="Complete Profile"
                    accessibilityRole="button"
                    disabled={uploading}
                >
                    {uploading ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text style={styles.buttonText}>Complete Profile</Text>
                    )}
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
                
                <div style={{ 
                    height: '100vh', 
                    width: '100%', 
                    overflow: 'auto',
                    WebkitOverflowScrolling: 'touch'
                }}>
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

            <KeyboardAvoidingView 
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                <ScrollView 
                    contentContainerStyle={styles.mainScrollContainer}
                    showsVerticalScrollIndicator={true} 
                >
                    <ProfileCompletionForm navigation={navigation} />
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    webContainer: {
        flex: 1,
        height: '100vh',
        width: '100%',
    },
    mainScrollContainer: {
        flexGrow: 1,
        alignItems: 'center',
        paddingVertical: 40,
        minHeight: Platform.OS === 'web' ? '100vh' : undefined,
    },
    formContainer: {
        width: '90%',
        maxWidth: 600,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
        elevation: 5,
        marginBottom: 20,
    },
    contentContainer: {
        paddingBottom: 10,
    },
    iconCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#E6E6FA',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
        alignSelf: 'center',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 30,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
    },
    subsectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#7B68EE',
        marginBottom: 10,
        marginTop: 10,
    },
    label: {
        fontSize: 13,
        color: '#333',
        marginBottom: 5,
        marginTop: 15,
    },
    fullWidthInput: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        paddingHorizontal: 15,
        height: 45,
        backgroundColor: '#FAFAFA',
        fontSize: 16,
        color: '#333',
    },
    textArea: {
        height: 'auto',
        minHeight: 80,
        paddingTop: 12,
        paddingBottom: 12,
    },
    inputIconGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        paddingHorizontal: 10,
        height: 45,
        backgroundColor: '#FAFAFA',
    },
    inputIcon: {
        marginRight: 10,
    },
    inputWithIcon: {
        flex: 1,
        fontSize: 16,
        paddingVertical: 0,
        color: '#333',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    rowItem: {
        flex: 1,
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 15,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#7B68EE',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    checkboxChecked: {
        backgroundColor: '#7B68EE',
    },
    checkboxLabel: {
        fontSize: 14,
        color: '#333',
        flex: 1,
    },
    uploadBox: {
        borderWidth: 2,
        borderColor: '#D3D3D3',
        borderStyle: 'dashed',
        borderRadius: 10,
        padding: 30,
        alignItems: 'center',
        backgroundColor: '#F8F8FF',
        marginTop: 10,
    },
    uploadText: {
        fontSize: 16,
        color: '#7B68EE',
        marginTop: 10,
        fontWeight: '600',
    },
    uploadHint: {
        fontSize: 12,
        color: '#999',
        marginTop: 5,
    },
    filePreview: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 10,
        padding: 15,
        backgroundColor: '#F8F8FF',
        marginTop: 10,
    },
    fileInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    fileDetails: {
        marginLeft: 12,
        flex: 1,
    },
    fileName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 2,
    },
    fileSize: {
        fontSize: 12,
        color: '#666',
    },
    removeButton: {
        padding: 5,
    },
    cvManualSection: {
        backgroundColor: '#F8F8FF',
        borderRadius: 10,
        padding: 20,
        marginTop: 10,
        borderWidth: 1,
        borderColor: '#E6E6FA',
    },
    cvManualHeader: {
        fontSize: 16,
        fontWeight: '600',
        color: '#7B68EE',
        marginBottom: 15,
    },
    button: {
        backgroundColor: '#7B68EE',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 30,
    },
    buttonDisabled: {
        backgroundColor: '#B0A8E8',
        opacity: 0.7,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    securityNote: {
        fontSize: 12,
        color: '#999',
        textAlign: 'center',
        marginTop: 20,
    },
});