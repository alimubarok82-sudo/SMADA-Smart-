import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  projectId: 'ai-studio-545922ef-0c6a-4451-9283-e7bd9fd76040',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  try {
    const querySnapshot = await getDocs(collection(db, 'exams'));
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(doc.id, '-> title:', data.title, 'targetClasses:', data.targetClasses, 'targetClass:', data.targetClass);
    });
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}
run();
