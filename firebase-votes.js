import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';

const config = {
  apiKey: 'AIzaSyBOXfloqpjZJSo9itkoF_FRvybQuiHKWJQ',
  authDomain: 'rebentaos-awards.firebaseapp.com',
  projectId: 'rebentaos-awards',
  storageBucket: 'rebentaos-awards.firebasestorage.app',
  messagingSenderId: '434854818580',
  appId: '1:434854818580:web:8e2d57f10fb369124e0801',
  measurementId: 'G-0ENMB7T4QS'
};
const app = initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();
const status = document.getElementById('authStatus');
const authButton = document.getElementById('authButton');
let user = null;
let selectedCategory = -1;
let busy = false;

function errorMessage(e) {
  if (e.code === 'auth/unauthorized-domain') return 'Aquest domini no està autoritzat a Firebase Authentication.';
  if (e.code === 'auth/popup-blocked') return 'El navegador ha bloquejat la finestra de Google. Torna-ho a provar.';
  if (e.code === 'permission-denied') return 'Accés denegat: comprova les regles de Firestore.';
  return e.message || 'Hi ha hagut un error. Torna-ho a provar.';
}
authButton.addEventListener('click', async () => {
  try {
    if (user) await signOut(auth);
    else await signInWithPopup(auth, provider);
  } catch(e) { status.textContent = errorMessage(e); }
});
getRedirectResult(auth).catch(e => { status.textContent = errorMessage(e); });
onAuthStateChanged(auth, u => {
  user = u;
  status.textContent = u ? `Sessió: ${u.email}` : 'Connecta amb Google per votar';
  authButton.textContent = u ? 'Tancar sessió' : 'Entrar amb Google';
  if (selectedCategory >= 0) renderVotePanel(selectedCategory);
});

window.renderVotePanel = renderVotePanel;
async function renderVotePanel(index) {
  selectedCategory = index;
  const category = window.rebCategories[index];
  const candidates = category.videos || category.photos || [];
  const detail = document.getElementById('detail');
  detail.querySelector('.vote-panel')?.remove();
  if (!candidates.length) return;
  const panel = document.createElement('section'); panel.className='vote-panel';
  const title = document.createElement('h3'); title.textContent='Vota aquesta categoria'; panel.append(title);
  const message = document.createElement('p'); message.className='vote-message'; panel.append(message);
  detail.append(panel);
  if (!user) { message.textContent='Inicia sessió amb Google (a dalt) per poder votar.'; return; }
  message.textContent='Comprovant si ja has votat...';
  const voteId = `${user.uid}_${index}`;
  const voteRef = doc(db,'votes',voteId);
  try {
    const existing = await getDoc(voteRef);
    if (selectedCategory !== index || !panel.isConnected) return;
    if (existing.exists()) { message.textContent='Ja has votat en aquesta categoria. Gràcies!'; return; }
  } catch(e) { message.textContent=errorMessage(e); return; }
  message.textContent='Tria un nominat. El vot és definitiu.';
  const options=document.createElement('div'); options.className='vote-options';
  candidates.forEach((c,i)=>{
    const label=document.createElement('label');label.className='vote-option';
    const input=document.createElement('input');input.type='radio';input.name='voteCandidate';input.value=String(i);
    label.append(input,document.createTextNode(c.title));options.append(label);
  });
  panel.append(options);
  const submit=document.createElement('button');submit.className='btn fill';submit.textContent='Confirmar vot';panel.append(submit);
  submit.addEventListener('click',async()=>{
    const chosen=options.querySelector('input:checked');
    if (!chosen) {message.textContent='Selecciona un nominat abans de votar.';return;}
    if (busy) return;
    busy=true;submit.disabled=true;message.textContent='Desant el teu vot...';
    try {
      await setDoc(voteRef,{ uid:user.uid, category:index, candidate:Number(chosen.value), createdAt:serverTimestamp() });
      options.remove();submit.remove();message.textContent='Vot guardat correctament! Gràcies per participar.';
    } catch(e) { message.textContent=errorMessage(e);submit.disabled=false; }
    finally {busy=false;}
  });
}
