// ==============================
//  지우의 연구노트 - app.js (Firebase 연동)
// ==============================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithPopup, signOut, GoogleAuthProvider, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, orderBy, query, serverTimestamp, Timestamp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadString, getDownloadURL, deleteObject }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// ==============================
//  Firebase 초기화
// ==============================
const firebaseConfig = {
  apiKey: "AIzaSyBScHkKJv-S1VIZeHEvBynDc8VhltZWCms",
  authDomain: "jiwoo-homepage.firebaseapp.com",
  projectId: "jiwoo-homepage",
  storageBucket: "jiwoo-homepage.firebasestorage.app",
  messagingSenderId: "118815870767",
  appId: "1:118815870767:web:f5264535a03a757d155bda",
  measurementId: "G-GY484VQJF1"
};

const OWNER_EMAIL = "ijiu24584@gmail.com";
const CAT_EMOJI = { 화학: '⚗️', 물리학: '⚛️', 수학: '📐', 생물: '🌿', 기타: '📌' };

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const storage = getStorage(firebaseApp);
const provider = new GoogleAuthProvider();

// ==============================
//  State
// ==============================
let posts = [];
let currentUser = null;
let isOwner = false;
let currentCat = '전체';
let currentSort = 'latest';
let currentTagFilter = null;
let currentSearchQuery = '';
let editingId = null;
let currentDetailId = null;
let pendingImageData = null;
let currentTags = [];

// ==============================
//  DOM Elements
// ==============================
const postsGrid       = document.getElementById('postsGrid');
const emptyState      = document.getElementById('emptyState');
const searchInput     = document.getElementById('searchInput');
const menuBtn         = document.getElementById('menuBtn');
const sidebar         = document.getElementById('sidebar');
const sidebarOverlay  = document.getElementById('sidebarOverlay');
const sidebarCats     = document.querySelectorAll('.sidebar-cats li');
const filterBtns      = document.querySelectorAll('.filter-btn');
const activeTagFilter = document.getElementById('activeTagFilter');
const sidebarTags     = document.getElementById('sidebarTags');
const loginBtn        = document.getElementById('loginBtn');
const userInfo        = document.getElementById('userInfo');
const userAvatar      = document.getElementById('userAvatar');
const logoutBtn       = document.getElementById('logoutBtn');
const openWriteBtn    = document.getElementById('openWriteBtn');
const modalOverlay    = document.getElementById('modalOverlay');
const closeWriteBtn   = document.getElementById('closeWriteBtn');
const cancelBtn       = document.getElementById('cancelBtn');
const saveBtn         = document.getElementById('saveBtn');
const modalTitle      = document.getElementById('modalTitle');
const postTitle       = document.getElementById('postTitle');
const postCat         = document.getElementById('postCat');
const postContent     = document.getElementById('postContent');
const tagInput        = document.getElementById('tagInput');
const tagList         = document.getElementById('tagList');
const imgUploadBox    = document.getElementById('imgUploadBox');
const imgInput        = document.getElementById('imgInput');
const imgPlaceholder  = document.getElementById('imgPlaceholder');
const imgPreview      = document.getElementById('imgPreview');
const imgRemoveBtn    = document.getElementById('imgRemoveBtn');
const detailOverlay   = document.getElementById('detailOverlay');
const closeDetailBtn  = document.getElementById('closeDetailBtn');
const detailBody      = document.getElementById('detailBody');
const editBtn         = document.getElementById('editBtn');
const deleteBtn       = document.getElementById('deleteBtn');
const loadingScreen   = document.getElementById('loadingScreen');

// ==============================
//  Auth
// ==============================
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  isOwner = user?.email === OWNER_EMAIL;
  updateAuthUI();
});

function updateAuthUI() {
  if (currentUser) {
    loginBtn.style.display = 'none';
    userInfo.style.display = 'flex';
    userAvatar.src = currentUser.photoURL || '';
    userAvatar.style.display = currentUser.photoURL ? 'block' : 'none';
  } else {
    loginBtn.style.display = 'flex';
    userInfo.style.display = 'none';
  }
  // 글쓰기 버튼은 오너만
  openWriteBtn.style.display = isOwner ? 'flex' : 'none';
  // 수정/삭제 버튼도 오너만
  if (editBtn) editBtn.style.display = isOwner ? 'inline-flex' : 'none';
  if (deleteBtn) deleteBtn.style.display = isOwner ? 'inline-flex' : 'none';
}

loginBtn.addEventListener('click', () => {
  signInWithPopup(auth, provider).catch(console.error);
});
logoutBtn.addEventListener('click', () => {
  signOut(auth);
});

// ==============================
//  Firestore 실시간 동기화
// ==============================
const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
onSnapshot(q, (snapshot) => {
  posts = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  if (loadingScreen) loadingScreen.style.display = 'none';
  renderPosts();
  renderSidebarTags();
}, (err) => {
  console.error(err);
  if (loadingScreen) loadingScreen.style.display = 'none';
});

// ==============================
//  Helpers
// ==============================
function formatDate(val) {
  if (!val) return '';
  const d = val instanceof Timestamp ? val.toDate() : new Date(val);
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
}

function escHtml(str = '') {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function shake(el) {
  el.style.animation = 'none'; el.offsetHeight;
  el.style.animation = 'shake 0.35s ease';
  el.addEventListener('animationend', () => { el.style.animation = ''; }, { once: true });
}

const shakeStyle = document.createElement('style');
shakeStyle.textContent = `@keyframes shake {
  0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-5px)} 40%,80%{transform:translateX(5px)}
}`;
document.head.appendChild(shakeStyle);

// ==============================
//  Render
// ==============================
function getFilteredPosts() {
  let filtered = [...posts];
  if (currentCat !== '전체') filtered = filtered.filter(p => p.cat === currentCat);
  if (currentTagFilter) filtered = filtered.filter(p => p.tags?.includes(currentTagFilter));
  if (currentSearchQuery.trim()) {
    const q = currentSearchQuery.toLowerCase();
    filtered = filtered.filter(p =>
      p.title?.toLowerCase().includes(q) ||
      p.content?.toLowerCase().includes(q) ||
      p.tags?.some(t => t.toLowerCase().includes(q))
    );
  }
  if (currentSort === 'upload') {
    filtered.sort((a,b) => {
      const ta = a.updatedAt instanceof Timestamp ? a.updatedAt.toMillis() : new Date(a.updatedAt||0).getTime();
      const tb = b.updatedAt instanceof Timestamp ? b.updatedAt.toMillis() : new Date(b.updatedAt||0).getTime();
      return tb - ta;
    });
  }
  return filtered;
}

function renderPosts() {
  const filtered = getFilteredPosts();
  postsGrid.innerHTML = '';
  emptyState.style.display = filtered.length === 0 ? 'block' : 'none';

  filtered.forEach((post, i) => {
    const card = document.createElement('div');
    card.className = 'post-card';
    card.style.animationDelay = `${i * 0.05}s`;

    const thumbHtml = post.image
      ? `<img src="${post.image}" alt="썸네일" />`
      : `<div class="post-thumb-placeholder"><span class="thumb-emoji">${CAT_EMOJI[post.cat]||'📌'}</span></div>`;

    const tagsHtml = (post.tags||[]).slice(0,3).map(t =>
      `<span class="post-tag" data-tag="${t}">#${t}</span>`
    ).join('');

    const wasEdited = post.updatedAt && post.createdAt &&
      formatDate(post.updatedAt) !== formatDate(post.createdAt);

    card.innerHTML = `
      <div class="post-thumb">
        ${thumbHtml}
        <span class="post-cat-badge">${post.cat}</span>
      </div>
      <div class="post-info">
        <div class="post-title">${escHtml(post.title)}</div>
        <div class="post-excerpt">${escHtml(post.content)}</div>
        <div class="post-tags">${tagsHtml}</div>
        <div class="post-meta">
          <span>📅 ${formatDate(post.createdAt)}</span>
          ${wasEdited ? `<span>✏️ ${formatDate(post.updatedAt)}</span>` : ''}
        </div>
      </div>`;

    card.addEventListener('click', (e) => {
      if (e.target.classList.contains('post-tag')) {
        e.stopPropagation();
        setTagFilter(e.target.dataset.tag);
        return;
      }
      openDetail(post.id);
    });

    postsGrid.appendChild(card);
  });
}

function renderSidebarTags() {
  const allTags = {};
  posts.forEach(p => (p.tags||[]).forEach(t => { allTags[t] = (allTags[t]||0)+1; }));
  sidebarTags.innerHTML = '';
  Object.entries(allTags).sort((a,b)=>b[1]-a[1]).slice(0,15).forEach(([tag]) => {
    const el = document.createElement('span');
    el.className = 'sidebar-tag-chip' + (currentTagFilter===tag?' active':'');
    el.textContent = '#' + tag;
    el.addEventListener('click', () => setTagFilter(currentTagFilter===tag ? null : tag));
    sidebarTags.appendChild(el);
  });
}

function setTagFilter(tag) {
  currentTagFilter = tag;
  renderActiveTagFilter();
  renderSidebarTags();
  renderPosts();
}

function renderActiveTagFilter() {
  activeTagFilter.innerHTML = '';
  if (currentTagFilter) {
    const pill = document.createElement('span');
    pill.className = 'active-tag-pill';
    pill.innerHTML = `#${currentTagFilter} <span class="remove">✕</span>`;
    pill.addEventListener('click', () => setTagFilter(null));
    activeTagFilter.appendChild(pill);
  }
}

// ==============================
//  Category & Filter
// ==============================
document.querySelectorAll('.cat-chip').forEach(btn => {
  btn.addEventListener('click', () => {
    currentCat = btn.dataset.cat;
    document.querySelectorAll('.cat-chip').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderPosts();
  });
});

sidebarCats.forEach(li => {
  li.addEventListener('click', () => {
    currentCat = li.dataset.cat;
    sidebarCats.forEach(l => l.classList.remove('active'));
    li.classList.add('active');
    document.querySelectorAll('.cat-chip').forEach(b => {
      b.classList.toggle('active', b.dataset.cat === currentCat);
    });
    renderPosts();
    closeSidebar();
  });
});

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    currentSort = btn.dataset.sort;
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderPosts();
  });
});

searchInput.addEventListener('input', (e) => {
  currentSearchQuery = e.target.value;
  renderPosts();
});

// ==============================
//  Sidebar
// ==============================
menuBtn.addEventListener('click', () => {
  sidebar.classList.toggle('open');
  sidebarOverlay.classList.toggle('show');
});
sidebarOverlay.addEventListener('click', closeSidebar);
function closeSidebar() {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('show');
}

// ==============================
//  Write Modal
// ==============================
function openWriteModal() {
  if (!isOwner) return;
  editingId = null;
  modalTitle.textContent = '새 연구노트 작성';
  postTitle.value = '';
  postCat.value = '화학';
  postContent.value = '';
  currentTags = [];
  pendingImageData = null;
  renderTagList();
  resetImgPreview();
  modalOverlay.classList.add('open');
  postTitle.focus();
}

function closeWriteModal() { modalOverlay.classList.remove('open'); }

openWriteBtn.addEventListener('click', openWriteModal);
closeWriteBtn.addEventListener('click', closeWriteModal);
cancelBtn.addEventListener('click', closeWriteModal);
modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeWriteModal(); });

// Image
imgUploadBox.addEventListener('click', (e) => { if (e.target !== imgRemoveBtn) imgInput.click(); });
imgInput.addEventListener('change', () => {
  const file = imgInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    pendingImageData = ev.target.result;
    imgPreview.src = pendingImageData;
    imgPreview.style.display = 'block';
    imgPlaceholder.style.display = 'none';
    imgRemoveBtn.style.display = 'flex';
  };
  reader.readAsDataURL(file);
});
imgRemoveBtn.addEventListener('click', (e) => { e.stopPropagation(); resetImgPreview(); });
function resetImgPreview() {
  pendingImageData = null;
  imgPreview.src = '';
  imgPreview.style.display = 'none';
  imgPlaceholder.style.display = 'flex';
  imgRemoveBtn.style.display = 'none';
  imgInput.value = '';
}

// Tags
tagInput.addEventListener('keydown', (e) => {
  if (['Enter',' ',','].includes(e.key)) {
    e.preventDefault();
    const val = tagInput.value.replace(/^#/,'').trim().replace(/\s+/g,'_');
    if (val && !currentTags.includes(val) && currentTags.length < 8) {
      currentTags.push(val);
      renderTagList();
    }
    tagInput.value = '';
  }
  if (e.key === 'Backspace' && tagInput.value === '' && currentTags.length) {
    currentTags.pop(); renderTagList();
  }
});

function renderTagList() {
  tagList.innerHTML = currentTags.map((t,i) =>
    `<span class="tag-item">#${escHtml(t)}<span class="tag-x" data-i="${i}">✕</span></span>`
  ).join('');
  tagList.querySelectorAll('.tag-x').forEach(x => {
    x.addEventListener('click', () => { currentTags.splice(parseInt(x.dataset.i),1); renderTagList(); });
  });
}

// Save to Firestore
saveBtn.addEventListener('click', async () => {
  if (!isOwner) return;
  const title = postTitle.value.trim();
  const content = postContent.value.trim();
  if (!title) { postTitle.focus(); shake(postTitle); return; }
  if (!content) { postContent.focus(); shake(postContent); return; }

  saveBtn.disabled = true;
  saveBtn.textContent = '저장 중...';

  try {
    // 이미지: base64를 Firebase Storage에 업로드
    let imageUrl = null;
    if (pendingImageData && pendingImageData.startsWith('data:')) {
      const imgRef = ref(storage, `posts/${Date.now()}.jpg`);
      await uploadString(imgRef, pendingImageData, 'data_url');
      imageUrl = await getDownloadURL(imgRef);
    } else if (pendingImageData) {
      imageUrl = pendingImageData; // 이미 URL인 경우 (수정 시)
    }

    if (editingId) {
      const postRef = doc(db, 'posts', editingId);
      const existing = posts.find(p => p.id === editingId);
      await updateDoc(postRef, {
        title, cat: postCat.value, content,
        tags: [...currentTags],
        image: imageUrl !== null ? imageUrl : (existing?.image || null),
        updatedAt: serverTimestamp(),
      });
    } else {
      await addDoc(collection(db, 'posts'), {
        title, cat: postCat.value, content,
        tags: [...currentTags],
        image: imageUrl,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    closeWriteModal();
  } catch (err) {
    console.error(err);
    alert('저장 중 오류가 발생했어요: ' + err.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = '저장';
  }
});

// ==============================
//  Detail Modal
// ==============================
function openDetail(id) {
  currentDetailId = id;
  const post = posts.find(p => p.id === id);
  if (!post) return;

  const wasEdited = post.updatedAt && post.createdAt &&
    formatDate(post.updatedAt) !== formatDate(post.createdAt);

  const thumbHtml = post.image
    ? `<img class="detail-thumb" src="${post.image}" alt="대표 이미지" />`
    : `<div class="detail-thumb-placeholder">${CAT_EMOJI[post.cat]||'📌'}</div>`;

  const tagsHtml = (post.tags||[]).map(t =>
    `<span class="detail-tag">#${escHtml(t)}</span>`
  ).join('');

  detailBody.innerHTML = `
    ${thumbHtml}
    <span class="detail-cat-badge">${post.cat}</span>
    <h2 class="detail-title">${escHtml(post.title)}</h2>
    <div class="detail-meta">
      <span>📅 작성일: ${formatDate(post.createdAt)}</span>
      ${wasEdited ? `<span>✏️ 수정일: ${formatDate(post.updatedAt)}</span>` : ''}
    </div>
    <div class="detail-content">${escHtml(post.content)}</div>
    ${tagsHtml ? `<div class="detail-tags">${tagsHtml}</div>` : ''}
  `;

  // 수정/삭제 버튼 오너만 표시
  editBtn.style.display = isOwner ? 'inline-flex' : 'none';
  deleteBtn.style.display = isOwner ? 'inline-flex' : 'none';

  detailOverlay.classList.add('open');
}

closeDetailBtn.addEventListener('click', () => detailOverlay.classList.remove('open'));
detailOverlay.addEventListener('click', (e) => { if (e.target === detailOverlay) detailOverlay.classList.remove('open'); });

editBtn.addEventListener('click', () => {
  if (!isOwner) return;
  const post = posts.find(p => p.id === currentDetailId);
  if (!post) return;
  detailOverlay.classList.remove('open');
  editingId = post.id;
  modalTitle.textContent = '연구노트 수정';
  postTitle.value = post.title;
  postCat.value = post.cat;
  postContent.value = post.content;
  currentTags = [...(post.tags||[])];
  renderTagList();
  pendingImageData = post.image || null;
  if (post.image) {
    imgPreview.src = post.image;
    imgPreview.style.display = 'block';
    imgPlaceholder.style.display = 'none';
    imgRemoveBtn.style.display = 'flex';
  } else {
    resetImgPreview();
  }
  modalOverlay.classList.add('open');
  postTitle.focus();
});

deleteBtn.addEventListener('click', async () => {
  if (!isOwner) return;
  if (!confirm('이 연구노트를 삭제할까요?')) return;
  try {
    const post = posts.find(p => p.id === currentDetailId);
    // Storage 이미지도 삭제 시도
    if (post?.image) {
      try {
        const imgRef = ref(storage, post.image);
        await deleteObject(imgRef);
      } catch (_) {}
    }
    await deleteDoc(doc(db, 'posts', currentDetailId));
    detailOverlay.classList.remove('open');
  } catch (err) {
    alert('삭제 중 오류: ' + err.message);
  }
});
