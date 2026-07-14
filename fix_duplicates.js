import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where, doc, writeBatch } from "firebase/firestore";

const firebaseConfig = {
  projectId: "gen-lang-client-0514337464",
  appId: "1:792788288028:web:05659742041e249ea995d9",
  apiKey: "AIzaSyDR7KKptJ5NycOzw87W5wGkxRz3mtJRtP0",
  authDomain: "gen-lang-client-0514337464.firebaseapp.com",
  storageBucket: "gen-lang-client-0514337464.firebasestorage.app",
  messagingSenderId: "792788288028",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, "ai-studio-545922ef-0c6a-4451-9283-e7bd9fd76040");

async function run() {
  const q = query(collection(db, 'users'), where('role', '==', 'siswa'));
  const querySnapshot = await getDocs(q);
  
  const users = {};
  
  querySnapshot.forEach((d) => {
    const data = d.data();
    const key = `${data.classId}_${data.displayName}`;
    
    if (!users[key]) {
      users[key] = [];
    }
    users[key].push({ id: d.id, data: data });
  });
  
  const batch = writeBatch(db);
  let count = 0;

  for (const key in users) {
    if (users[key].length > 1) {
      console.log(`Duplicate found for ${key}:`, users[key].map(u => u.id));
      
      // Sort to keep the shorter ID (admin-generated IDs are 20 chars, Auth UIDs are 28 chars)
      users[key].sort((a, b) => a.id.length - b.id.length);
      
      const keep = users[key][0];
      const remove = users[key].slice(1);
      
      for (const r of remove) {
        // If the removed one has authUid or its ID is 28 chars, it's an Auth uid, save it to the kept one
        if (!keep.data.authUid && (r.data.authUid || r.id.length === 28)) {
           const uid = r.data.authUid || r.id;
           console.log(`Setting authUid ${uid} on ${keep.id}`);
           batch.update(doc(db, 'users', keep.id), { authUid: uid, email: r.data.email || keep.data.email });
           count++;
        }
        console.log(`Deleting ${r.id}`);
        batch.delete(doc(db, 'users', r.id));
        count++;
      }
    }
  }
  
  if (count > 0) {
    await batch.commit();
    console.log(`Cleaned up ${count} operations.`);
  } else {
    console.log('No duplicates found.');
  }
  process.exit(0);
}
run();
