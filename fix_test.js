import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

const firebaseConfig = {
  projectId: 'ai-studio-545922ef-0c6a-4451-9283-e7bd9fd76040',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  try {
     const q = query(collection(db, 'users'), where('role', '==', 'siswa'));
     const snaps = await getDocs(q);
     console.log("Success, got", snaps.docs.length);
  } catch(e) {
     console.error(e.message);
  }
  process.exit(0);
}
run();
