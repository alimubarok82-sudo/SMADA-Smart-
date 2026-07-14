import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc, writeBatch } from "firebase/firestore";

const firebaseConfig = {
  projectId: "gen-lang-client-0514337464",
  apiKey: "AIzaSyDR7KKptJ5NycOzw87W5wGkxRz3mtJRtP0",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, "ai-studio-545922ef-0c6a-4451-9283-e7bd9fd76040");

async function run() {
  const usersSnap = await getDocs(collection(db, 'users'));
  const validUserIds = new Set();
  usersSnap.forEach(d => validUserIds.add(d.id));
  
  const batch = writeBatch(db);
  let count = 0;
  
  // Clean attendance
  const attSnap = await getDocs(collection(db, 'attendance'));
  attSnap.forEach(d => {
    if (!validUserIds.has(d.data().studentId)) {
      console.log(`Deleting orphaned attendance: ${d.id}`);
      batch.delete(doc(db, 'attendance', d.id));
      count++;
    }
  });

  // Clean exam_results
  const resSnap = await getDocs(collection(db, 'exam_results'));
  resSnap.forEach(d => {
    if (!validUserIds.has(d.data().studentId)) {
      console.log(`Deleting orphaned exam_result: ${d.id}`);
      batch.delete(doc(db, 'exam_results', d.id));
      count++;
    }
  });
  
  if (count > 0) {
    await batch.commit();
    console.log(`Cleaned ${count} orphaned records.`);
  } else {
    console.log('No orphaned records.');
  }
  process.exit(0);
}
run();
