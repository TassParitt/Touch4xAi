import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  orderBy,
  getDocs,
  deleteDoc,
  getDocFromServer,
  Timestamp,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { SavedRecord } from '../types';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Initialize Firestore (use custom firestoreDatabaseId if configured)
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Test connection on boot as required by skill
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or network restricted:', error.message);
    }
  }
}
testFirestoreConnection();

// Auth Helpers
export async function signInWithGoogle(): Promise<User | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Save/update user profile in Firestore
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(
        userRef,
        {
          userId: user.uid,
          email: user.email || '',
          displayName: user.displayName || 'Touch_AI Creator',
          photoURL: user.photoURL || '',
          lastLoginAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }
    return user;
  } catch (err) {
    console.error('Sign-in error:', err);
    throw err;
  }
}

export async function logOut(): Promise<void> {
  await signOut(auth);
}

// Measurement persistence in Firestore
export async function saveMeasurementToFirestore(
  userId: string,
  record: SavedRecord
): Promise<void> {
  try {
    const recordRef = doc(db, 'users', userId, 'measurements', record.id);
    await setDoc(recordRef, {
      id: record.id,
      userId,
      objectName: record.objectName,
      mode: record.mode,
      score: record.score,
      descriptor: record.descriptor,
      summary: record.summary,
      dominantHarmonic: record.dominantHarmonic,
      dampingRatio: record.dampingRatio,
      confidencePercent: record.confidencePercent,
      avgDb: record.avgDb,
      timestamp: record.timestamp,
      storageType: record.storageType,
      targetFolder: record.targetFolder,
      dspParameters: record.dspParameters || null,
      timeDomainSignal: record.timeDomainSignal || null,
      spectrumDbData: record.spectrumDbData || null,
      dominantPeaks: record.dominantPeaks || null,
      visualizerSnapshot: record.visualizerSnapshot || null,
      waveformSnapshotUrl: record.waveformSnapshotUrl || null,
      fftSnapshotUrl: record.fftSnapshotUrl || null,
      deviceModel: record.deviceModel || 'Smartphone Acoustic Sensor',
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error saving measurement to Firestore:', err);
    throw err;
  }
}

export async function fetchUserMeasurementsFromFirestore(
  userId: string
): Promise<SavedRecord[]> {
  try {
    const q = query(collection(db, 'users', userId, 'measurements'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const records: SavedRecord[] = [];
    snapshot.forEach((docSnap) => {
      const d = docSnap.data();
      records.push({
        id: d.id,
        timestamp: d.timestamp,
        objectName: d.objectName,
        mode: d.mode,
        score: d.score,
        descriptor: d.descriptor,
        summary: d.summary,
        dominantHarmonic: d.dominantHarmonic,
        dampingRatio: d.dampingRatio,
        confidencePercent: d.confidencePercent,
        peakFreqs: [],
        avgDb: d.avgDb,
        modeSpecificMetric: {
          label: d.mode === 'texture' ? 'Slide Cycles' : d.mode === 'hardness' ? 'Tap Impulse' : 'Hold Time',
          value: d.mode === 'density' ? '5.0s' : '5/5',
        },
        storageType: d.storageType || 'cloud',
        targetFolder: d.targetFolder || 'Cloud Vault',
        dspParameters: d.dspParameters || undefined,
        timeDomainSignal: d.timeDomainSignal || undefined,
        spectrumDbData: d.spectrumDbData || undefined,
        dominantPeaks: d.dominantPeaks || undefined,
        visualizerSnapshot: d.visualizerSnapshot || undefined,
        waveformSnapshotUrl: d.waveformSnapshotUrl || undefined,
        fftSnapshotUrl: d.fftSnapshotUrl || undefined,
        deviceModel: d.deviceModel || undefined,
      });
    });
    return records;
  } catch (err) {
    console.error('Error fetching measurements from Firestore:', err);
    return [];
  }
}

export async function deleteMeasurementFromFirestore(
  userId: string,
  measurementId: string
): Promise<void> {
  try {
    const recordRef = doc(db, 'users', userId, 'measurements', measurementId);
    await deleteDoc(recordRef);
  } catch (err) {
    console.error('Error deleting measurement from Firestore:', err);
    throw err;
  }
}
