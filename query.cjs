const admin = require("firebase-admin");
admin.initializeApp({
  projectId: "ai-studio-545922ef-0c6a-4451-9283-e7bd9fd76040"
});
const db = admin.firestore();
async function run() {
  const querySnapshot = await db.collection("exams").get();
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    console.log(doc.id, "title:", data.title, "targetClasses:", data.targetClasses, "targetClass:", data.targetClass);
  });
}
run();
