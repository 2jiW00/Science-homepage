// ==============================
//  지우의 연구노트 - app.js
// ==============================

const STORAGE_KEY = 'jiwoo_posts';
const CAT_EMOJI = { 화학: '⚗️', 물리학: '⚛️', 수학: '📐', 생물: '🌿', 기타: '📌' };

// ---- State ----
let posts = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
let currentCat = '전체';
let currentSort = 'latest';
let currentTagFilter = null;
let currentSearchQuery = '';
let editingId = null;
let currentDetailId = null;
let pendingImageData = null;

// ---- Elements ----
const postsGrid = document.getElementById('postsGrid');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const menuBtn = document.getElementById('menuBtn');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const catChips = document.getElementById('catChips');
const sidebarCats = document.querySelectorAll('.sidebar-cats li');
const filterBtns = document.querySelectorAll('.filter-btn');
const activeTagFilter = document.getElementById('activeTagFilter');
const sidebarTags = document.getElementById('sidebarTags');

// Write modal
const openWriteBtn = document.getElementById('openWriteBtn');
const modalOverlay = document.getElementById('modalOverlay');
const closeWriteBtn = document.getElementById('closeWriteBtn');
const cancelBtn = document.getElementById('cancelBtn');
const saveBtn = document.getElementById('saveBtn');
const modalTitle = document.getElementById('modalTitle');
const postTitle = document.getElementById('postTitle');
const postCat = document.getElementById('postCat');
const postContent = document.getElementById('postContent');
const tagInput = document.getElementById('tagInput');
const tagList = document.getElementById('tagList');
const imgUploadBox = document.getElementById('imgUploadBox');
const imgInput = document.getElementById('imgInput');
const imgPlaceholder = document.getElementById('imgPlaceholder');
const imgPreview = document.getElementById('imgPreview');
const imgRemoveBtn = document.getElementById('imgRemoveBtn');

// Detail modal
const detailOverlay = document.getElementById('detailOverlay');
const closeDetailBtn = document.getElementById('closeDetailBtn');
const detailBody = document.getElementById('detailBody');
const editBtn = document.getElementById('editBtn');
const deleteBtn = document.getElementById('deleteBtn');

// ---- Local current tags ----
let currentTags = [];

// ==============================
//  RENDER
// ==============================

function savePosts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
}

function formatDate(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
}

function getFilteredPosts() {
  let filtered = [...posts];
  if (currentCat !== '전체') filtered = filtered.filter(p => p.cat === currentCat);
  if (currentTagFilter) filtered = filtered.filter(p => p.tags && p.tags.includes(currentTagFilter));
  if (currentSearchQuery.trim()) {
    const q = currentSearchQuery.toLowerCase();
    filtered = filtered.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.content.toLowerCase().includes(q) ||
      (p.tags && p.tags.some(t => t.toLowerCase().includes(q)))
    );
  }
  if (currentSort === 'latest') filtered.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  else filtered.sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  return filtered;
}

function renderPosts() {
  const filtered = getFilteredPosts();
  postsGrid.innerHTML = '';
  if (filtered.length === 0) {
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';
  filtered.forEach((post, i) => {
    const card = document.createElement('div');
    card.className = 'post-card';
    card.style.animationDelay = `${i * 0.05}s`;

    const thumbHtml = post.image
      ? `<img src="${post.image}" alt="썸네일" />`
      : `<div class="post-thumb-placeholder"><span class="thumb-emoji">${CAT_EMOJI[post.cat] || '📌'}</span></div>`;

    const tagsHtml = (post.tags || []).slice(0,3).map(t =>
      `<span class="post-tag" data-tag="${t}">#${t}</span>`
    ).join('');

    const wasEdited = post.updatedAt && post.updatedAt !== post.createdAt;

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
  posts.forEach(p => (p.tags || []).forEach(t => { allTags[t] = (allTags[t] || 0) + 1; }));
  sidebarTags.innerHTML = '';
  Object.entries(allTags).sort((a,b) => b[1]-a[1]).slice(0,15).forEach(([tag]) => {
    const el = document.createElement('span');
    el.className = 'sidebar-tag-chip' + (currentTagFilter === tag ? ' active' : '');
    el.textContent = '#' + tag;
    el.addEventListener('click', () => setTagFilter(currentTagFilter === tag ? null : tag));
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

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ==============================
//  CATEGORY CHIPS
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

// ==============================
//  FILTER BUTTONS
// ==============================

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    currentSort = btn.dataset.sort;
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderPosts();
  });
});

// ==============================
//  SEARCH
// ==============================

searchInput.addEventListener('input', (e) => {
  currentSearchQuery = e.target.value;
  renderPosts();
});

// ==============================
//  SIDEBAR
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
//  WRITE MODAL
// ==============================

function openWriteModal() {
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

function closeWriteModal() {
  modalOverlay.classList.remove('open');
}

openWriteBtn.addEventListener('click', openWriteModal);
closeWriteBtn.addEventListener('click', closeWriteModal);
cancelBtn.addEventListener('click', closeWriteModal);
modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeWriteModal(); });

// Image upload
imgUploadBox.addEventListener('click', (e) => {
  if (e.target === imgRemoveBtn) return;
  imgInput.click();
});
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
imgRemoveBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  resetImgPreview();
});
function resetImgPreview() {
  pendingImageData = null;
  imgPreview.src = '';
  imgPreview.style.display = 'none';
  imgPlaceholder.style.display = 'flex';
  imgRemoveBtn.style.display = 'none';
  imgInput.value = '';
}

// Tag input
tagInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ' || e.key === ',') {
    e.preventDefault();
    const val = tagInput.value.replace(/^#/, '').trim().replace(/\s+/g, '_');
    if (val && !currentTags.includes(val) && currentTags.length < 8) {
      currentTags.push(val);
      renderTagList();
    }
    tagInput.value = '';
  }
  if (e.key === 'Backspace' && tagInput.value === '' && currentTags.length) {
    currentTags.pop();
    renderTagList();
  }
});

function renderTagList() {
  tagList.innerHTML = currentTags.map((t, i) =>
    `<span class="tag-item">#${escHtml(t)}<span class="tag-x" data-i="${i}">✕</span></span>`
  ).join('');
  tagList.querySelectorAll('.tag-x').forEach(x => {
    x.addEventListener('click', () => {
      currentTags.splice(parseInt(x.dataset.i), 1);
      renderTagList();
    });
  });
}

// Save
saveBtn.addEventListener('click', () => {
  const title = postTitle.value.trim();
  const content = postContent.value.trim();
  if (!title) { postTitle.focus(); shake(postTitle); return; }
  if (!content) { postContent.focus(); shake(postContent); return; }

  const now = new Date().toISOString();

  if (editingId) {
    const idx = posts.findIndex(p => p.id === editingId);
    if (idx !== -1) {
      posts[idx] = {
        ...posts[idx],
        title,
        cat: postCat.value,
        content,
        tags: [...currentTags],
        image: pendingImageData !== null ? pendingImageData : posts[idx].image,
        updatedAt: now,
      };
    }
  } else {
    posts.unshift({
      id: Date.now().toString(),
      title,
      cat: postCat.value,
      content,
      tags: [...currentTags],
      image: pendingImageData || null,
      createdAt: now,
      updatedAt: now,
    });
  }

  savePosts();
  renderPosts();
  renderSidebarTags();
  closeWriteModal();
});

function shake(el) {
  el.style.animation = 'none';
  el.offsetHeight;
  el.style.animation = 'shake 0.35s ease';
  el.addEventListener('animationend', () => { el.style.animation = ''; }, { once: true });
}

// Add shake animation
const style = document.createElement('style');
style.textContent = `@keyframes shake {
  0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-5px)} 40%,80%{transform:translateX(5px)}
}`;
document.head.appendChild(style);

// ==============================
//  DETAIL MODAL
// ==============================

function openDetail(id) {
  currentDetailId = id;
  const post = posts.find(p => p.id === id);
  if (!post) return;

  const wasEdited = post.updatedAt && post.updatedAt !== post.createdAt;

  const thumbHtml = post.image
    ? `<img class="detail-thumb" src="${post.image}" alt="대표 이미지" />`
    : `<div class="detail-thumb-placeholder">${CAT_EMOJI[post.cat] || '📌'}</div>`;

  const tagsHtml = (post.tags || []).map(t =>
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

  detailOverlay.classList.add('open');
}

closeDetailBtn.addEventListener('click', () => detailOverlay.classList.remove('open'));
detailOverlay.addEventListener('click', (e) => { if (e.target === detailOverlay) detailOverlay.classList.remove('open'); });

editBtn.addEventListener('click', () => {
  const post = posts.find(p => p.id === currentDetailId);
  if (!post) return;
  detailOverlay.classList.remove('open');

  editingId = post.id;
  modalTitle.textContent = '연구노트 수정';
  postTitle.value = post.title;
  postCat.value = post.cat;
  postContent.value = post.content;
  currentTags = [...(post.tags || [])];
  renderTagList();

  pendingImageData = null;
  if (post.image) {
    imgPreview.src = post.image;
    imgPreview.style.display = 'block';
    imgPlaceholder.style.display = 'none';
    imgRemoveBtn.style.display = 'flex';
    pendingImageData = post.image;
  } else {
    resetImgPreview();
  }

  modalOverlay.classList.add('open');
  postTitle.focus();
});

deleteBtn.addEventListener('click', () => {
  if (!confirm('이 연구노트를 삭제할까요?')) return;
  posts = posts.filter(p => p.id !== currentDetailId);
  savePosts();
  renderPosts();
  renderSidebarTags();
  detailOverlay.classList.remove('open');
});

// ==============================
//  SAMPLE DATA (first run)
// ==============================

if (posts.length === 0) {
  const now = new Date();
  const d1 = new Date(now - 2*86400000).toISOString();
  const d2 = new Date(now - 86400000).toISOString();
  const d3 = now.toISOString();
  posts = [
    {
      id: '1',
      title: '반도체의 원리',
      cat: '화학',
      content: '반도체의 원리에 관한 내용 소개 요약. 반도체는 규소에다가 불순물을 첨가하여 전기 전도성을 조절합니다. N형 반도체는 전자를 도너로 추가하고, P형은 정공을 형성합니다. PN 접합이 다이오드와 트랜지스터의 기본이 됩니다.',
      tags: ['반도체', '화학', 'PN접합'],
      image: null,
      createdAt: d1,
      updatedAt: d1,
    },
    {
      id: '2',
      title: '전자가 벽을 통과하는 이유',
      cat: '물리학',
      content: '양자역학에서 터널링 현상이란 입자가 고전역학적으로 넘을 수 없는 퍼텐셜 장벽을 통과하는 현상입니다. 이 현상은 파동함수의 지수적 감쇠로 설명됩니다. 반도체 소자와 핵융합 반응에서 중요한 역할을 합니다.',
      tags: ['양자역학', '전자', '터널링'],
      image: null,
      createdAt: d2,
      updatedAt: d2,
    },
    {
      id: '3',
      title: '반데르발스 힘은 어디에 영향을 미치는가?',
      cat: '화학',
      content: '반데르발스 힘은 분자 간에 작용하는 약한 인력입니다. 색소폰 발 패드가 붙는 현상, 게코 도마뱀이 벽을 기어오르는 원리 모두 이 힘과 관련됩니다. 분산력(런던 힘), 쌍극자-쌍극자 상호작용, 수소결합을 통합하여 설명됩니다.',
      tags: ['반데르발스', '분자간힘', '화학결합'],
      image: null,
      createdAt: d3,
      updatedAt: d3,
    },
  ];
  savePosts();
}

// ==============================
//  INIT
// ==============================

renderPosts();
renderSidebarTags();
