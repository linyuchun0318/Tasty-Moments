// 呷好食光 - 高齡者日常餐食辨識與家庭飲食支持系統
// 核心互動邏輯

document.addEventListener('DOMContentLoaded', () => {
  // 畫面元素清單
  const screens = {
    login: document.getElementById('screen-login'),
    register: document.getElementById('screen-register'),
    dashboard: document.getElementById('screen-dashboard'),
    camera: document.getElementById('screen-camera'),
    candidate: document.getElementById('screen-candidate'),
    clarify: document.getElementById('screen-clarify'),
    explanation: document.getElementById('screen-explanation'),
    action: document.getElementById('screen-action'),
    share: document.getElementById('screen-share'),
    diary: document.getElementById('screen-diary'),
    diaryDetail: document.getElementById('screen-diary-detail'),
    chatList: document.getElementById('screen-chat-list'),
    chatDetail: document.getElementById('screen-chat-detail'),
  };

  const modalAiRefine = document.getElementById('modal-ai-refine');
  const mainAppHeader = document.getElementById('main-app-header');
  const headerBackBtn = document.getElementById('header-back-btn');
  const headerTitle = document.getElementById('header-title');
  const bottomNav = document.getElementById('bottom-nav');
  const navItems = document.querySelectorAll('.nav-item');

  // 角色切換按鈕
  const roleElderBtn = document.getElementById('role-elder-btn');
  const roleFamilyBtn = document.getElementById('role-family-btn');

  // 狀態管理
  let currentScreenId = 'screen-login';
  let historyStack = [];
  let currentRole = 'elder'; // 'elder' | 'family'
  let currentChosenText = '這餐要不要試試少加一點醬？';

  // 畫面標題對照表 (全數取自 PDF 與 Figma)
  const screenTitles = {
    'screen-login': '呷好食光',
    'screen-register': '呷好食光',
    'screen-dashboard': '呷好食光',
    'screen-camera': '拍攝畫面',
    'screen-candidate': '辨識候選',
    'screen-clarify': '菜色與份量確認',
    'screen-explanation': '來源與說明',
    'screen-action': '紀錄處理',
    'screen-share': '分享預覽',
    'screen-diary': '餐食日記',
    'screen-diary-detail': '詳細資料',
    'screen-chat-list': '聊天室',
    'screen-chat-detail': '家人A'
  };

  // 切換畫面函式
  function navigateTo(targetId, addToHistory = true) {
    const targetScreen = document.getElementById(targetId);
    if (!targetScreen) return;

    if (addToHistory && currentScreenId && currentScreenId !== targetId) {
      historyStack.push(currentScreenId);
    }

    currentScreenId = targetId;

    // 隱藏所有畫面
    Object.values(screens).forEach(screen => {
      if (screen) screen.classList.remove('active');
    });

    // 顯示目標畫面
    targetScreen.classList.add('active');
    targetScreen.scrollTop = 0;

    // 更新頂欄顯示狀態 (需求2：第一頁初始畫面不重複出現「呷好食光」)
    if (mainAppHeader) {
      if (targetId === 'screen-login' || targetId === 'screen-camera') {
        mainAppHeader.style.display = 'none';
      } else {
        mainAppHeader.style.display = 'flex';
      }
    }

    // 更新標題
    if (headerTitle) {
      headerTitle.textContent = screenTitles[targetId] || '呷好食光';
    }

    // 更新返回按鈕顯示
    if (headerBackBtn) {
      if (targetId === 'screen-login' || targetId === 'screen-dashboard') {
        headerBackBtn.style.visibility = 'hidden';
      } else {
        headerBackBtn.style.visibility = 'visible';
      }
    }

    // 更新底部導覽列顯示與選中狀態
    if (bottomNav) {
      if (targetId === 'screen-login' || targetId === 'screen-register' || targetId === 'screen-camera') {
        bottomNav.style.display = 'none';
      } else {
        bottomNav.style.display = 'flex';
      }

      navItems.forEach(item => {
        const navTarget = item.getAttribute('data-target');
        if (navTarget === targetId) {
          item.classList.add('active');
        } else if (targetId === 'screen-diary-detail' && navTarget === 'screen-diary') {
          item.classList.add('active');
        } else if ((targetId.startsWith('screen-candidate') || targetId.startsWith('screen-clarify') || targetId.startsWith('screen-explanation') || targetId.startsWith('screen-action') || targetId.startsWith('screen-share')) && navTarget === 'screen-camera') {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      });
    }
  }

  // 返回上一頁
  if (headerBackBtn) {
    headerBackBtn.addEventListener('click', () => {
      if (historyStack.length > 0) {
        const prevId = historyStack.pop();
        navigateTo(prevId, false);
      } else {
        navigateTo('screen-dashboard', false);
      }
    });
  }

  // 底部導覽點擊
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const target = item.getAttribute('data-target');
      if (target) {
        navigateTo(target);
      }
    });
  });

  // 角色切換
  if (roleElderBtn && roleFamilyBtn) {
    roleElderBtn.addEventListener('click', () => {
      currentRole = 'elder';
      roleElderBtn.classList.add('active');
      roleFamilyBtn.classList.remove('active');
      updateRoleView();
    });

    roleFamilyBtn.addEventListener('click', () => {
      currentRole = 'family';
      roleFamilyBtn.classList.add('active');
      roleElderBtn.classList.remove('active');
      updateRoleView();
    });
  }

  function updateRoleView() {
    const chatTitleElem = document.getElementById('chat-role-title');
    if (chatTitleElem) {
      if (currentRole === 'family') {
        chatTitleElem.textContent = '家人端｜收到分享後';
      } else {
        chatTitleElem.textContent = '長者端｜分享與交流';
      }
    }
  }

  // 1. 登入畫面互動 (點擊 Google / 臉書 / LINE 登入進入主畫面)
  const loginButtons = document.querySelectorAll('.btn-login-action');
  loginButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      navigateTo('screen-dashboard');
    });
  });

  const btnGotoRegister = document.getElementById('btn-goto-register');
  if (btnGotoRegister) {
    btnGotoRegister.addEventListener('click', () => {
      navigateTo('screen-register');
    });
  }

  const btnRegisterBack = document.getElementById('btn-register-back');
  if (btnRegisterBack) {
    btnRegisterBack.addEventListener('click', () => {
      navigateTo('screen-login');
    });
  }

  const registerButtons = document.querySelectorAll('.btn-register-action');
  registerButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      navigateTo('screen-dashboard');
    });
  });

  // 2. 主畫面 (Dashboard) 互動
  // 按「拍攝餐食」→ 螢幕換成「拍攝頁面」
  const btnMenuCamera = document.getElementById('btn-menu-camera');
  if (btnMenuCamera) {
    btnMenuCamera.addEventListener('click', () => {
      navigateTo('screen-camera');
    });
  }

  const btnMenuDiary = document.getElementById('btn-menu-diary');
  if (btnMenuDiary) {
    btnMenuDiary.addEventListener('click', () => {
      navigateTo('screen-diary');
    });
  }

  const btnMenuChat = document.getElementById('btn-menu-chat');
  if (btnMenuChat) {
    btnMenuChat.addEventListener('click', () => {
      navigateTo('screen-chat-list');
    });
  }

  // 3. 拍攝畫面 (Camera Screen) 互動
  const btnCameraShutter = document.getElementById('btn-camera-shutter');
  if (btnCameraShutter) {
    btnCameraShutter.addEventListener('click', () => {
      resetCandidateDisplay();
      navigateTo('screen-candidate');
    });
  }

  // 4. 初步辨識畫面 (Candidate) 互動
  // 按「是的，下一步」→切換到 「提問與確認頁面」
  const btnCandidateNext = document.getElementById('btn-candidate-next');
  if (btnCandidateNext) {
    btnCandidateNext.addEventListener('click', () => {
      navigateTo('screen-clarify');
    });
  }

  const btnCandidateRetake = document.getElementById('btn-candidate-retake');
  if (btnCandidateRetake) {
    btnCandidateRetake.addEventListener('click', () => {
      navigateTo('screen-camera');
    });
  }

  const btnCandidateVoiceFix = document.getElementById('btn-candidate-voice-fix');
  if (btnCandidateVoiceFix) {
    btnCandidateVoiceFix.addEventListener('click', () => {
      const candidateTextElem = document.getElementById('candidate-dishes-text');
      const candidateVoiceFeedback = document.getElementById('candidate-voice-feedback');
      if (candidateTextElem) {
        candidateTextElem.textContent = '豆腐、青菜、白飯';
      }
      if (candidateVoiceFeedback) {
        candidateVoiceFeedback.textContent = '這是豆腐';
        candidateVoiceFeedback.style.display = 'inline-block';
      }
    });
  }

  function resetCandidateDisplay() {
    const candidateTextElem = document.getElementById('candidate-dishes-text');
    const candidateVoiceFeedback = document.getElementById('candidate-voice-feedback');
    if (candidateTextElem) {
      candidateTextElem.textContent = '滷肉、青菜、白飯';
    }
    if (candidateVoiceFeedback) {
      candidateVoiceFeedback.style.display = 'none';
      candidateVoiceFeedback.textContent = '';
    }
  }

  // 5. 提問與確認頁面 (Clarify) 互動
  const btnPortionSelect = document.getElementById('btn-portion-select');
  const portionOptions = ['半碗飯 / 可修改', '一碗飯 / 可修改', '少於半碗 / 可修改'];
  let portionIndex = 0;
  if (btnPortionSelect) {
    btnPortionSelect.addEventListener('click', () => {
      portionIndex = (portionIndex + 1) % portionOptions.length;
      btnPortionSelect.textContent = portionOptions[portionIndex];
    });
  }

  const btnVoiceAnswer = document.getElementById('btn-voice-answer');
  const btnSkipQuestion = document.getElementById('btn-skip-question');
  const clarifyAnswerFeedback = document.getElementById('clarify-answer-feedback');

  if (btnVoiceAnswer) {
    btnVoiceAnswer.addEventListener('click', () => {
      if (clarifyAnswerFeedback) {
        clarifyAnswerFeedback.textContent = '豆腐是蒸的';
        clarifyAnswerFeedback.style.display = 'inline-block';
      }
    });
  }

  if (btnSkipQuestion) {
    btnSkipQuestion.addEventListener('click', () => {
      if (clarifyAnswerFeedback) {
        clarifyAnswerFeedback.textContent = '不知道／略過';
        clarifyAnswerFeedback.style.display = 'inline-block';
      }
    });
  }

  const btnClarifyConfirm = document.getElementById('btn-clarify-confirm');
  if (btnClarifyConfirm) {
    btnClarifyConfirm.addEventListener('click', () => {
      navigateTo('screen-explanation');
    });
  }

  // 6. 來源與說明畫面 (Explanation) 互動
  const btnToggleBasis = document.getElementById('btn-toggle-basis');
  const basisDetailBox = document.getElementById('basis-detail-box');
  if (btnToggleBasis && basisDetailBox) {
    btnToggleBasis.addEventListener('click', () => {
      if (basisDetailBox.style.display === 'none' || basisDetailBox.style.display === '') {
        basisDetailBox.style.display = 'block';
      } else {
        basisDetailBox.style.display = 'none';
      }
    });
  }

  const btnExplanationNext = document.getElementById('btn-explanation-next');
  if (btnExplanationNext) {
    btnExplanationNext.addEventListener('click', () => {
      navigateTo('screen-action');
    });
  }

  // 7. 紀錄處理畫面 (Action) 互動
  const btnActionSavePrivate = document.getElementById('btn-action-save-private');
  if (btnActionSavePrivate) {
    btnActionSavePrivate.addEventListener('click', () => {
      navigateTo('screen-diary');
    });
  }

  const btnActionSharePreview = document.getElementById('btn-action-share-preview');
  if (btnActionSharePreview) {
    btnActionSharePreview.addEventListener('click', () => {
      navigateTo('screen-share');
    });
  }

  const btnActionDelete = document.getElementById('btn-action-delete');
  if (btnActionDelete) {
    btnActionDelete.addEventListener('click', () => {
      navigateTo('screen-dashboard');
    });
  }

  // 8. 分享預覽畫面 (Share) 互動
  const shareRecipients = ['接收者：家人 A', '接收者：家人 B', '接收者：家人 C'];
  let recipientIndex = 0;
  const shareRecipientTitle = document.querySelector('#screen-share .card-title');
  const btnChangeRecipient = document.querySelector('#screen-share button[style*="font-size: 17px"]');
  if (btnChangeRecipient && shareRecipientTitle) {
    btnChangeRecipient.addEventListener('click', () => {
      recipientIndex = (recipientIndex + 1) % shareRecipients.length;
      shareRecipientTitle.textContent = shareRecipients[recipientIndex];
    });
  }

  const btnShareConfirm = document.getElementById('btn-share-confirm');
  if (btnShareConfirm) {
    btnShareConfirm.addEventListener('click', () => {
      navigateTo('screen-chat-detail');
    });
  }

  const btnShareBackEdit = document.getElementById('btn-share-back-edit');
  if (btnShareBackEdit) {
    btnShareBackEdit.addEventListener('click', () => {
      navigateTo('screen-clarify');
    });
  }

  const btnShareCancel = document.getElementById('btn-share-cancel');
  if (btnShareCancel) {
    btnShareCancel.addEventListener('click', () => {
      navigateTo('screen-dashboard');
    });
  }

  // 9. 餐食日記詳細資料按鈕互動 (需求8)
  const detailDateTitle = document.getElementById('detail-date-title');
  const diaryDetailButtons = document.querySelectorAll('.btn-view-diary-detail');
  diaryDetailButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const dateStr = e.currentTarget.getAttribute('data-date') || '11/10';
      if (detailDateTitle) {
        detailDateTitle.textContent = `${dateStr} 詳細資料`;
      }
      navigateTo('screen-diary-detail');
    });
  });

  const btnBackToDiary = document.getElementById('btn-back-to-diary');
  if (btnBackToDiary) {
    btnBackToDiary.addEventListener('click', () => {
      navigateTo('screen-diary');
    });
  }

  // 10. 聊天室聯絡人清單 (Chat List)
  const contactItems = document.querySelectorAll('.contact-list-item');
  contactItems.forEach(item => {
    item.addEventListener('click', () => {
      navigateTo('screen-chat-detail');
    });
  });

  // 11. 聊天室對話與回覆互動 (Chat Detail)
  // 使用者可於聊天頁面查看其他用戶傳來的餐食照片與資訊，可以「直接回覆」或「請ai協助潤飾語氣」
  const chatInput = document.getElementById('chat-input-text');
  const btnDirectReply = document.getElementById('btn-direct-reply');
  const btnAiRefine = document.getElementById('btn-ai-refine');
  const chatMessagesContainer = document.getElementById('chat-messages-container');

  if (btnDirectReply) {
    btnDirectReply.addEventListener('click', () => {
      const messageText = chatInput.value.trim() || '不要再淋醬了';
      appendChatMessage(messageText, 'sent');
      chatInput.value = '';
    });
  }

  if (btnAiRefine) {
    btnAiRefine.addEventListener('click', () => {
      if (modalAiRefine) {
        modalAiRefine.classList.add('active');
      }
    });
  }

  // AI 潤飾語氣彈窗內選項與按鈕
  const btnSelectDraft = document.getElementById('btn-select-draft');
  const btnSelectOriginal = document.getElementById('btn-select-original');
  const btnModalConfirmSend = document.getElementById('btn-modal-confirm-send');
  const btnModalCancel = document.getElementById('btn-modal-cancel');
  const compareDraftElem = document.getElementById('compare-draft-box');
  const compareOrigElem = document.getElementById('compare-orig-box');

  if (btnSelectDraft) {
    btnSelectDraft.addEventListener('click', () => {
      currentChosenText = '這餐要不要試試少加一點醬？';
      if (compareDraftElem) compareDraftElem.style.border = '2px solid #059669';
      if (compareOrigElem) compareOrigElem.style.border = 'none';
      if (chatInput) chatInput.value = currentChosenText;
    });
  }

  if (btnSelectOriginal) {
    btnSelectOriginal.addEventListener('click', () => {
      currentChosenText = '不要再淋醬了';
      if (compareOrigElem) compareOrigElem.style.border = '2px solid #DC2626';
      if (compareDraftElem) compareDraftElem.style.border = 'none';
      if (chatInput) chatInput.value = currentChosenText;
    });
  }

  if (btnModalConfirmSend) {
    btnModalConfirmSend.addEventListener('click', () => {
      appendChatMessage(currentChosenText, 'sent');
      if (modalAiRefine) {
        modalAiRefine.classList.remove('active');
      }
      if (chatInput) chatInput.value = '';
    });
  }

  if (btnModalCancel) {
    btnModalCancel.addEventListener('click', () => {
      if (modalAiRefine) {
        modalAiRefine.classList.remove('active');
      }
    });
  }

  function appendChatMessage(text, type) {
    if (!chatMessagesContainer) return;
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble bubble-${type}`;
    bubble.textContent = text;
    chatMessagesContainer.appendChild(bubble);
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
  }

  // 初始化畫面為登入畫面
  navigateTo('screen-login', false);
});
