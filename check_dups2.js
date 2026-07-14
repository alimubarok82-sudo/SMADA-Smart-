import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";

const firebaseConfig = {
  projectId: "gen-lang-client-0514337464",
  apiKey: "AIzaSyDR7KKptJ5NycOzw87W5wGkxRz3mtJRtP0",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, "ai-studio-545922ef-0c6a-4451-9283-e7bd9fd76040");

async function run() {
  const q = query(collection(db, 'users'), where('role', '==', 'siswa'));
  const querySnapshot = await getDocs(q);
  
  const users = {};
  querySnapshot.forEach((d) => {
    const data = d.data();
    // Normalise name: trim and lowercase
    const name = (data.displayName || '').trim().toLowerCase();
    const key = `${data.classId}_${name}`;
    if (!users[key]) users[key] = [];
    users[key].push(d.id);
  });
  
  let dups = 0;
  for (const key in users) {
    if (users[key].length > 1) {
      console.log(`Duplicate: ${key} ->`, users[key]);
      dups++;
    }
  }
  console.log(`Total duplicated normalized names: ${dups}`);
  process.exit(0);
}
run();
