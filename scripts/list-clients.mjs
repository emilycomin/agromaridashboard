import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyC0nuATe5xK9A2qr7rK4c4zDSiIwQQMNsQ',
  authDomain: 'agromari-dashboard.firebaseapp.com',
  projectId: 'agromari-dashboard',
  storageBucket: 'agromari-dashboard.firebasestorage.app',
  messagingSenderId: '273759646475',
  appId: '1:273759646475:web:5fdca85f7ceee92dbe680e',
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

const snap = await getDocs(collection(db, 'clients'));
snap.docs.forEach(d => {
  const data = d.data();
  console.log(`id: ${d.id}  name: ${data.name}  archived: ${data.archived ?? false}`);
});
process.exit(0);
