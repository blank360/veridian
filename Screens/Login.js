import { useState, useEffect, useRef } from "react";
import { ActivityIndicator, Pressable, View, Text, Animated, StyleSheet, Dimensions, Easing, Platform } from "react-native";
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import { getAuth, GoogleAuthProvider, signInWithCredential, signInWithPopup } from 'firebase/auth';
import { collection, getDocs, query, where } from "firebase/firestore";
import { useNavigation } from "@react-navigation/native";
import { FIREBASE_Auth, FIREBASE_DB } from "../firebaseconfig";

const { width, height } = Dimensions.get('window');
const BACKGROUND_COLOR = '#0F172A'; 
const AI_GLOW_COLOR = '#38BDF8'; 

export default function Login({}) {
    const [loading, setloading] = useState(false);
    const navigation = useNavigation();
    const holeScale = useRef(new Animated.Value(0)).current; 
    const contentScale = useRef(new Animated.Value(1)).current; 
    const contentRotate = useRef(new Animated.Value(0)).current; 
    const entranceOpacity = useRef(new Animated.Value(0)).current;
    const entranceTranslateY = useRef(new Animated.Value(50)).current;
    const pulseAnim1 = useRef(new Animated.Value(0)).current;
    const pulseAnim2 = useRef(new Animated.Value(0)).current;


    const startBackgroundAI = () => {
        const createPulse = (animValue, delay) => {
            Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(animValue, {
                        toValue: 1,
                        duration: 4000, 
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(animValue, {
                        toValue: 0,
                        duration: 4000,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    })
                ])
            ).start();
        };
        createPulse(pulseAnim1, 0);
        createPulse(pulseAnim2, 2000); 
    };

    const runEntranceAnimation = () => {
        Animated.parallel([
            Animated.timing(entranceOpacity, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
            }),
            Animated.spring(entranceTranslateY, {
                toValue: 0,
                friction: 6,
                useNativeDriver: true,
            })
        ]).start();
    };

    const runBlackHoleAnimation = (onFinished) => {
        pulseAnim1.stopAnimation();
        pulseAnim2.stopAnimation();

        Animated.parallel([
            Animated.timing(holeScale, { toValue: 60, duration: 1200, useNativeDriver: true }),
            Animated.timing(contentScale, { toValue: 0, duration: 800, useNativeDriver: true }),
            Animated.timing(contentRotate, { toValue: 1, duration: 800, useNativeDriver: true }),
            Animated.timing(pulseAnim1, { toValue: 0, duration: 300, useNativeDriver: true }),
            Animated.timing(pulseAnim2, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start(() => {
            if (onFinished) onFinished();
        });
    };

    useEffect(() => {
        startBackgroundAI();
        runEntranceAnimation();

        try {
            if (Platform.OS !== 'web') {
                GoogleSignin.configure({ webClientId: "454123473244-cae6tjs817jp3pscordofaki0bef6n8g.apps.googleusercontent.com" });
            }

            const unsubscribe = FIREBASE_Auth.onAuthStateChanged(user => {
                const takeref = collection(FIREBASE_DB, "Profile");
                if (user) {
                    const newquereyref = query(takeref, where("userID", "==", user.uid));
                    getDocs(newquereyref).then((data) => {
                        if (data.empty) {
                            runBlackHoleAnimation(() => navigation.navigate('Profile', { flag: true }));
                        } else {
                            runBlackHoleAnimation(() => navigation.navigate('Home'));
                        }
                    }).catch((error) => { console.error("Error getting document:", error); });
                }
            });
            return () => unsubscribe();
        } catch (error) { console.error(error); }
    }, [])

    const siginInWithGoogle = async () => {
        setloading(true);
        try {
            if (Platform.OS === 'web') {
                const provider = new GoogleAuthProvider();
                await signInWithPopup(FIREBASE_Auth, provider);
            } else {
                await GoogleSignin.hasPlayServices();
                let userInfo = await GoogleSignin.signIn();
                const credential = GoogleAuthProvider.credential(userInfo.data.idToken);
                await signInWithCredential(FIREBASE_Auth, credential);
            }
        } catch (error) {
            console.error("Login Failed:", error);
           
        } finally {
            setloading(false);
        }
    }
    const spin = contentRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '720deg'] });
    const pulse1ScaleInterp = pulseAnim1.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.5] });
    const pulse1OpacityInterp = pulseAnim1.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.3, 0] });
    const pulse2ScaleInterp = pulseAnim2.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.8] });
    const pulse2OpacityInterp = pulseAnim2.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.2, 0] });

    return (
        <View style={styles.container}>
            <View style={styles.aiContainer}>
                <Animated.View style={[styles.aiPulse, { 
                    transform: [{ scale: pulse1ScaleInterp }], 
                    opacity: pulse1OpacityInterp 
                }]} />
                 <Animated.View style={[styles.aiPulse, { 
                    width: 400, height: 400, borderRadius: 200, 
                    transform: [{ scale: pulse2ScaleInterp }], 
                    opacity: pulse2OpacityInterp 
                }]} />
                 <View style={styles.aiCore} />
            </View>

          
            <Animated.View style={[styles.blackHole, { transform: [{ scale: holeScale }] } ]} />

            <Animated.View 
                style={[
                    styles.contentWrapper,
                    {
                        opacity: entranceOpacity, 
                        transform: [
                            { scale: contentScale }, 
                            { rotate: spin },        
                            { translateY: entranceTranslateY } 
                        ]
                    }
                ]}
            >
                <Text style={styles.titleText}>AI Interview Portal</Text>
                <Text style={styles.subtitleText}>Identity Verification</Text>
                
                {loading && <ActivityIndicator size="large" color={AI_GLOW_COLOR} style={{marginTop: 20}} />}
                
                <Pressable style={styles.googleButton} onPress={siginInWithGoogle}>
                    <View style={styles.iconPlaceholder}><Text style={{fontWeight:'bold', color:'black'}}>G</Text></View>
                    <Text style={styles.buttonText}>{loading ? "Connecting..." : "Sign in with Google"}</Text>
                </Pressable>
            </Animated.View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: BACKGROUND_COLOR, 
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden', 
    },
    aiContainer: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    aiCore: {
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: BACKGROUND_COLOR,
        borderWidth: 2,
        borderColor: AI_GLOW_COLOR,
        opacity: 0.5,
        position: 'absolute',
    },
    aiPulse: {
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: AI_GLOW_COLOR,
    },
    blackHole: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'black',
        top: height / 2 - 50, 
        left: width / 2 - 50,
        zIndex: 20, 
        borderWidth: 2,
        borderColor: '#ffffff30', 
    },
    contentWrapper: {
        alignItems: 'center',
        zIndex: 30,
        padding: 30,
        backgroundColor: '#1e293b90', 
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#ffffff20',
        width: width * 0.85,
    },
    titleText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 5,
        textAlign: 'center',
    },
    subtitleText: {
        fontSize: 16,
        color: '#94a3b8',
        marginBottom: 30,
         textAlign: 'center',
    },
    googleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 24,
        backgroundColor: 'white',
        borderRadius: 30,
        marginTop: 20,
        elevation: 5,
        shadowColor: AI_GLOW_COLOR, 
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    iconPlaceholder: {
        width: 24, height: 24, borderRadius: 12, backgroundColor: '#ddd', justifyContent:'center', alignItems:'center', marginRight: 10
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'black',
    }
});