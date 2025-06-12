// تهيئة Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBinpejpZQv71xxhJrlYcET-uNLPL0pROY",
  authDomain: "ynmo-center-scheduler.firebaseapp.com",
  databaseURL: "https://ynmo-center-scheduler-default-rtdb.firebaseio.com",
  projectId: "ynmo-center-scheduler",
  storageBucket: "ynmo-center-scheduler.appspot.com",
  messagingSenderId: "287665928063",
  appId: "1:287665928063:web:67f6bccd66a25ef0118c4a"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
