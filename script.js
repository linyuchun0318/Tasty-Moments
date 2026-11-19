// 呷好食光 - 高齡者日常餐食辨識與家庭飲食支持系統
// 核心互動與狀態聯動邏輯

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
  const modalRecipients = document.getElementById('modal-recipients');
  const mainAppHeader = document.getElementById('main-app-header');
  const headerBackBtn = document.getElementById('header-back-btn');
  const headerTitle = document.getElementById('header-title');
  const bottomNav = document.getElementById('bottom-nav');
  const navItems = document.querySelectorAll('.nav-item');

  // 頂部角色按鈕
  const roleElderBtn = document.getElementById('role-elder-btn');
  const roleFamilyBtn = document.getElementById('role-family-btn');

  // 字串正規化輔助函式（去除空白，避免比對錯誤）
  const normContact = (name) => (name || '').replace(/\s+/g, '');

  // 全域狀態
  let currentScreenId = 'screen-login';
  let historyStack = [];
  let currentRole = 'elder'; // 'elder' | 'family'
  let activeContact = '家人A';
  let currentChosenText = '';
  let currentAiDraftText = ''; // AI 草稿（隨打開的聯絡人動態更新）

  // 份量與調味聯動狀態
  let chosenPortion = '半碗飯';
  let cookingMethod = '蒸的';
  let soySauceAmount = '少許／一茶匙';
  let oilAmount = '少許水煮油';

  // 分享對象聯動集合（預設僅家人A收到分享，其餘對象預設未收到）
  let selectedRecipients = ['家人A'];
  let sharedMealContacts = new Set(['家人A']);

  // 家人個別回覆紀錄狀態庫（原始語氣，未經 AI 潤飾）
  let familyReplies = {
    '家人A': '不要再淋醬了',
    '家人B': '媽，今天吃了啥？',
    '家人C': '阿嬤湯太鹹別喝'
  };
  // AI 精練後的回覆（每位家人，確認送出後才寫入）
  let refinedReplies = {};

  // 判斷資訊是否充足之邏輯 (問題 1 核心判定)
  // 依國健署衛教原則：若調味品用量為「未知／略過」，無法精確估算鈉含量，保留未知
  function isInformationSufficient() {
    return soySauceAmount !== '用量未知';
  }

  // 估算營養與鈉含量範圍 (問題 1 聯動估算)
  function getCalculatedNutrition() {
    const isSufficient = isInformationSufficient();
    let cal = 105; // 豆腐 (85) + 空心菜 (20)
    let protein = 10.6; // 豆腐 (8.5) + 空心菜 (2.1)
    let sodiumText = '350~450 mg';
    let sodiumRangeText = '350～450 毫克';

    if (chosenPortion === '一碗飯') {
      cal += 280;
      protein += 6.0;
    } else if (chosenPortion === '半碗飯') {
      cal += 140;
      protein += 3.0;
    } else {
      cal += 90;
      protein += 2.0;
    }

    if (cookingMethod === '煎的') {
      cal += 40;
    }

    if (oilAmount === '偏油／多油炒') cal += 65;
    else if (oilAmount === '正常用油') cal += 35;
    else if (oilAmount === '少許水煮油') cal += 15;
    else if (oilAmount === '無油清蒸') cal += 0;
    else { // 用量未知
      cal += 20;
    }

    if (!isSufficient) {
      sodiumText = '無法精確估算';
      sodiumRangeText = '資訊不足，無法精確估算鈉含量（保留未知）';
    } else {
      if (soySauceAmount === '未加醬油') {
        sodiumText = '50~80 mg';
        sodiumRangeText = '50～80 毫克（天然原味，極低鈉）';
      } else if (soySauceAmount === '少許／一茶匙') {
        sodiumText = '350~450 mg';
        sodiumRangeText = '350～450 毫克（約佔每日上限 17%）';
      } else if (soySauceAmount === '正常鹹度') {
        sodiumText = '600~750 mg';
        sodiumRangeText = '600～750 毫克（約佔每日上限 28%）';
      } else if (soySauceAmount === '偏鹹／很多') {
        sodiumText = '850~1100 mg';
        sodiumRangeText = '850～1100 毫克（調味較重）';
      }
    }

    const isAllSkipped = (cookingMethod === '烹調方式未知' && soySauceAmount === '用量未知' && oilAmount === '用量未知');
    const calPrefix = isAllSkipped ? '約 ' : '';
    const calSuffix = isAllSkipped ? ' 大卡 (粗估)' : ' 大卡';

    return {
      isSufficient,
      isAllSkipped,
      calories: `${calPrefix}${Math.round(cal)}${calSuffix}`,
      caloriesNum: Math.round(cal),
      protein: `${protein.toFixed(1)} g`,
      sodium: sodiumText,
      sodiumRange: sodiumRangeText
    };
  }

  // 餐食日記資料對照庫
  const diaryDatabase = {
    '11/10': {
      date: '11/10',
      title: '11/10 詳細資料',
      dishes: '已確認：豆腐、青菜、白飯',
      img: 'meal.jpg',
      portion: () => `實際食用份量：${chosenPortion}`,
      method: () => `烹調方式：${cookingMethod}`,
      seasoning: () => `調味資訊：醬油${soySauceAmount}、用油${oilAmount}`,
      getNutrition: () => getCalculatedNutrition(),
      basis: '選用台灣常用食品營養成分資料庫項目（白飯、傳統板豆腐、空心菜）；調味依填答資訊完成數值推估。',
      suggestion: '可詢問醬料是否能另放，兼顧美味與健康；是否採用由您自主決定。'
    },
    '11/9': {
      date: '11/9',
      title: '11/9 詳細資料',
      dishes: '已確認：白飯、滷肉、蛋、青菜',
      img: 'meal_1109.jpg',
      portion: () => '實際食用份量：一碗飯',
      method: () => '烹調方式：滷五花肉、煎荷包蛋、蒜炒高麗菜',
      seasoning: () => '調味資訊：滷汁淋飯、少許醬油',
      getNutrition: () => ({
        calories: '680 大卡',
        protein: '24.5 g',
        sodium: '780~920 mg',
        isSufficient: true
      }),
      basis: '選用台灣常用食品營養成分資料庫項目（白飯、三層肉/控肉、雞蛋、甘藍/高麗菜）；依家常料理條件推估。',
      suggestion: '滷肉油脂與醬汁較多，建議可減少醬汁淋飯；蛋與蔬菜營養豐富好消化。是否採用由您自主決定。'
    },
    '11/5': {
      date: '11/5',
      title: '11/5 詳細資料',
      dishes: '已確認：白飯、魚肉、青菜',
      img: 'meal_1105.jpg',
      portion: () => '實際食用份量：半碗飯',
      method: () => '烹調方式：香煎海水魚佐薑絲、蒜炒空心菜',
      seasoning: () => '調味資訊：少許鹽、少許食用油',
      getNutrition: () => ({
        calories: '390 大卡',
        protein: '23.0 g',
        sodium: '350~450 mg',
        isSufficient: true
      }),
      basis: '選用台灣常用食品營養成分資料庫項目（白飯、海水魚/煎魚、空心菜）；系統依確認資訊查詢完成推估。',
      suggestion: '魚肉富含優質蛋白質與Omega-3不飽和脂肪酸，肉質細嫩好吞嚥，搭配深綠色蔬菜非常均衡。是否採用由您自主決定。'
    }
  };

  // 畫面標題對照表
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

  // 更新聊天室聯絡人清單標籤 (問題 2 核心優化)
  function updateChatListBadges() {
    const allContacts = ['家人A', '家人B', '家人C', 'AI助手'];
    allContacts.forEach(name => {
      const tagElem = document.getElementById(`tag-${name}`);
      if (tagElem) {
        if (sharedMealContacts.has(name)) {
          tagElem.className = 'shared-tag';
          tagElem.textContent = '已分享';
        } else {
          tagElem.className = 'unshared-tag';
          tagElem.textContent = '未分享';
        }
      }
    });
  }

  // 畫面切換函式
  function navigateTo(targetId, addToHistory = true) {
    const targetScreen = document.getElementById(targetId);
    if (!targetScreen) return;

    if (addToHistory && currentScreenId && currentScreenId !== targetId) {
      historyStack.push(currentScreenId);
    }

    currentScreenId = targetId;

    Object.values(screens).forEach(screen => {
      if (screen) screen.classList.remove('active');
    });

    targetScreen.classList.add('active');
    targetScreen.scrollTop = 0;

    if (mainAppHeader) {
      if (targetId === 'screen-login' || targetId === 'screen-camera') {
        mainAppHeader.style.display = 'none';
      } else {
        mainAppHeader.style.display = 'flex';
      }
    }

    if (headerTitle) {
      if (targetId === 'screen-chat-detail') {
        headerTitle.textContent = normContact(activeContact);
      } else {
        headerTitle.textContent = screenTitles[targetId] || '呷好食光';
      }
    }

    if (headerBackBtn) {
      if (targetId === 'screen-login' || targetId === 'screen-dashboard') {
        headerBackBtn.style.visibility = 'hidden';
      } else {
        headerBackBtn.style.visibility = 'visible';
      }
    }

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

    if (targetId === 'screen-chat-list') {
      updateChatListBadges();
    }

    if (targetId === 'screen-chat-detail') {
      renderChatDetailView();
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

  // 頂部角色切換
  if (roleElderBtn && roleFamilyBtn) {
    roleElderBtn.addEventListener('click', () => {
      currentRole = 'elder';
      roleElderBtn.classList.add('active');
      roleFamilyBtn.classList.remove('active');
      if (currentScreenId === 'screen-chat-detail') {
        renderChatDetailView();
      }
    });

    roleFamilyBtn.addEventListener('click', () => {
      currentRole = 'family';
      roleFamilyBtn.classList.add('active');
      roleElderBtn.classList.remove('active');
      if (currentScreenId === 'screen-chat-detail') {
        renderChatDetailView();
      }
    });
  }

  // 1. 登入畫面
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

  // 2. 主畫面
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

  // 3. 拍攝畫面
  const btnCameraShutter = document.getElementById('btn-camera-shutter');
  if (btnCameraShutter) {
    btnCameraShutter.addEventListener('click', () => {
      resetCandidateDisplay();
      resetClarifyQuestions();
      navigateTo('screen-candidate');
    });
  }

  // 4. 初步辨識畫面
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

  // 5. 提問與確認頁面
  const btnPortionSelect = document.getElementById('btn-portion-select');
  const portionStatusBadge = document.getElementById('portion-status-badge');
  const portionOptions = ['半碗飯', '一碗飯', '少於半碗'];
  let portionIndex = 0;

  function updatePortionState(index) {
    portionIndex = index;
    chosenPortion = portionOptions[portionIndex];
    if (btnPortionSelect) btnPortionSelect.textContent = `${chosenPortion} / 可修改`;
    if (portionStatusBadge) portionStatusBadge.textContent = `已選擇：${chosenPortion}`;
    syncPortionToAllScreens();
  }

  if (btnPortionSelect) {
    btnPortionSelect.addEventListener('click', () => {
      const nextIdx = (portionIndex + 1) % portionOptions.length;
      updatePortionState(nextIdx);
    });
  }

  // 核心同步：動態依使用者實際回答狀況判定「資訊已足夠」或「資訊不足」 (問題 1 核心)
  function syncPortionToAllScreens() {
    const expConfirmed = document.getElementById('explanation-confirmed-text');
    if (expConfirmed) expConfirmed.textContent = `已確認：豆腐、青菜、${chosenPortion}`;

    const basisPortionDisplay = document.getElementById('basis-portion-display');
    if (basisPortionDisplay) basisPortionDisplay.textContent = chosenPortion;

    const basisCalPortion = document.getElementById('basis-cal-portion');
    if (basisCalPortion) basisCalPortion.textContent = chosenPortion;

    // 取得即時推估數據與充足性判定
    const nutri = getCalculatedNutrition();
    const expBadge = document.getElementById('explanation-calc-badge');
    const expCal = document.getElementById('exp-nutri-cal');
    const expProtein = document.getElementById('exp-nutri-protein');
    const expSodium = document.getElementById('exp-nutri-sodium');
    const basisSodiumRange = document.getElementById('basis-sodium-range');
    const basisCalories = document.getElementById('basis-calories');
    const basisSodiumPara = document.getElementById('basis-sodium-explain-para');

    // 動態切換提示徽章 (問題 1)
    if (expBadge) {
      if (nutri.isSufficient) {
        expBadge.className = 'card-badge badge-success';
        expBadge.textContent = '資訊已足夠：已為您推估營養素與鈉含量範圍';
      } else {
        expBadge.className = 'card-badge badge-warning';
        expBadge.textContent = '資訊不足，無法精確估算鈉含量';
      }
    }

    if (expCal) expCal.textContent = nutri.calories;
    if (expProtein) expProtein.textContent = nutri.protein;

    if (expSodium) {
      expSodium.textContent = nutri.sodium;
      if (!nutri.isSufficient) {
        expSodium.style.fontSize = '13px';
        expSodium.style.color = '#B45309';
      } else {
        expSodium.style.fontSize = '16px';
        expSodium.style.color = '#047857';
      }
    }

    if (basisSodiumRange) basisSodiumRange.textContent = nutri.sodiumRange;
    if (basisCalories) basisCalories.textContent = nutri.caloriesNum;

    // 更新說明段落文本
    if (basisSodiumPara) {
      let condText = `${cookingMethod}、醬油：${soySauceAmount}、用油：${oilAmount}`;
      if (nutri.isAllSkipped) condText = '烹調與調味資訊皆略過（未知）';

      if (nutri.isSufficient) {
        basisSodiumPara.innerHTML = `依據您補充之調味條件（<span id="basis-cond-display">${condText}</span>），推估每餐鈉含量約為 <span id="basis-sodium-range" style="font-weight: 800; color: #047857;">${nutri.sodiumRange}</span>（國健署建議每日鈉攝取上限 2400 毫克，本餐屬健康適中範圍）。系統不憑外觀斷定「吃太鹹」，呈現推估依據供您參考。`;
      } else {
        basisSodiumPara.innerHTML = `依據衛福部國健署高齡營養衛教原則，因調味品份量選擇略過，<strong>調味品份量資訊不足，無法精確估算鈉含量</strong>。系統尊重長者自主意願，不強制填答、不憑外觀臆測斷定「吃太鹹」，因此此項數值保留未知。`;
      }
    }

    const sharePortionInfo = document.getElementById('share-portion-info');
    if (sharePortionInfo) sharePortionInfo.textContent = `已確認：豆腐、青菜、${chosenPortion}`;

    const diaryDetailPortion = document.getElementById('diary-detail-portion');
    if (diaryDetailPortion) diaryDetailPortion.textContent = `實際食用份量：${chosenPortion}`;
  }

  const clarifyQ1Box = document.getElementById('clarify-q1-box');
  const clarifyQ2Box = document.getElementById('clarify-q2-box');
  const clarifyQ3Box = document.getElementById('clarify-q3-box');

  const q1Cards = document.querySelectorAll('.q1-card');
  const q1Feedback = document.getElementById('q1-feedback');
  const q2Cards = document.querySelectorAll('.q2-card');
  const q2Feedback = document.getElementById('q2-feedback');
  const q3Cards = document.querySelectorAll('.q3-card');
  const q3Feedback = document.getElementById('q3-feedback');
  const btnClarifyConfirm = document.getElementById('btn-clarify-confirm');

  function resetClarifyQuestions() {
    cookingMethod = '蒸的';
    soySauceAmount = '少許／一茶匙';
    oilAmount = '少許水煮油';

    if (clarifyQ1Box) clarifyQ1Box.style.display = 'block';
    if (clarifyQ2Box) clarifyQ2Box.style.display = 'none';
    if (clarifyQ3Box) clarifyQ3Box.style.display = 'none';

    q1Cards.forEach(c => c.classList.remove('selected'));
    if (q1Cards[0]) q1Cards[0].classList.add('selected');
    if (q1Feedback) {
      q1Feedback.textContent = '已確認：蒸的';
      q1Feedback.style.display = 'inline-block';
    }

    q2Cards.forEach(c => c.classList.remove('selected'));
    if (q2Cards[1]) q2Cards[1].classList.add('selected');
    if (q2Feedback) {
      q2Feedback.textContent = '已確認：少許／一茶匙';
      q2Feedback.style.display = 'none';
    }

    q3Cards.forEach(c => c.classList.remove('selected'));
    if (q3Cards[1]) q3Cards[1].classList.add('selected');
    if (q3Feedback) {
      q3Feedback.textContent = '已確認：少許水煮油';
      q3Feedback.style.display = 'none';
    }

    syncCookingDetails();
  }

  // 問題 1 互動 (烹調方式)
  q1Cards.forEach(card => {
    card.addEventListener('click', () => {
      q1Cards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      cookingMethod = card.getAttribute('data-val') || '蒸的';
      if (q1Feedback) {
        q1Feedback.textContent = `已確認：${cookingMethod}`;
        q1Feedback.style.display = 'inline-block';
      }
      syncCookingDetails();
      if (clarifyQ2Box) {
        clarifyQ2Box.style.display = 'block';
        clarifyQ2Box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  });

  const btnQ1Voice = document.getElementById('btn-q1-voice');
  if (btnQ1Voice) {
    btnQ1Voice.addEventListener('click', () => {
      cookingMethod = '蒸的';
      q1Cards.forEach(c => c.classList.remove('selected'));
      if (q1Cards[0]) q1Cards[0].classList.add('selected');
      if (q1Feedback) {
        q1Feedback.textContent = '語音輸入已確認：蒸的';
        q1Feedback.style.display = 'inline-block';
      }
      syncCookingDetails();
      if (clarifyQ2Box) {
        clarifyQ2Box.style.display = 'block';
        clarifyQ2Box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }

  const btnQ1Skip = document.getElementById('btn-q1-skip');
  if (btnQ1Skip) {
    btnQ1Skip.addEventListener('click', () => {
      cookingMethod = '烹調方式未知';
      q1Cards.forEach(c => c.classList.remove('selected'));
      if (q1Feedback) {
        q1Feedback.textContent = '已略過';
        q1Feedback.style.display = 'inline-block';
      }
      syncCookingDetails();
      if (clarifyQ2Box) {
        clarifyQ2Box.style.display = 'block';
        clarifyQ2Box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }

  // 問題 2 互動 (醬油用量)
  q2Cards.forEach(card => {
    card.addEventListener('click', () => {
      q2Cards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      soySauceAmount = card.getAttribute('data-val') || '少許／一茶匙';
      if (q2Feedback) {
        q2Feedback.textContent = `已確認：${soySauceAmount}`;
        q2Feedback.style.display = 'inline-block';
      }
      syncCookingDetails();
      if (clarifyQ3Box) {
        clarifyQ3Box.style.display = 'block';
        clarifyQ3Box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  });

  const btnQ2Voice = document.getElementById('btn-q2-voice');
  if (btnQ2Voice) {
    btnQ2Voice.addEventListener('click', () => {
      soySauceAmount = '少許／一茶匙';
      q2Cards.forEach(c => c.classList.remove('selected'));
      if (q2Cards[1]) q2Cards[1].classList.add('selected');
      if (q2Feedback) {
        q2Feedback.textContent = '語音輸入已確認：少許／一茶匙';
        q2Feedback.style.display = 'inline-block';
      }
      syncCookingDetails();
      if (clarifyQ3Box) {
        clarifyQ3Box.style.display = 'block';
        clarifyQ3Box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }

  const btnQ2Skip = document.getElementById('btn-q2-skip');
  if (btnQ2Skip) {
    btnQ2Skip.addEventListener('click', () => {
      soySauceAmount = '用量未知';
      q2Cards.forEach(c => c.classList.remove('selected'));
      if (q2Feedback) {
        q2Feedback.textContent = '已略過';
        q2Feedback.style.display = 'inline-block';
      }
      syncCookingDetails();
      if (clarifyQ3Box) {
        clarifyQ3Box.style.display = 'block';
        clarifyQ3Box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }

  // 問題 3 互動 (用油量)
  q3Cards.forEach(card => {
    card.addEventListener('click', () => {
      q3Cards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      oilAmount = card.getAttribute('data-val') || '少許水煮油';
      if (q3Feedback) {
        q3Feedback.textContent = `已確認：${oilAmount}`;
        q3Feedback.style.display = 'inline-block';
      }
      syncCookingDetails();
      if (btnClarifyConfirm) {
        btnClarifyConfirm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  });

  const btnQ3Voice = document.getElementById('btn-q3-voice');
  if (btnQ3Voice) {
    btnQ3Voice.addEventListener('click', () => {
      oilAmount = '少許水煮油';
      q3Cards.forEach(c => c.classList.remove('selected'));
      if (q3Cards[1]) q3Cards[1].classList.add('selected');
      if (q3Feedback) {
        q3Feedback.textContent = '語音輸入已確認：少許水煮油';
        q3Feedback.style.display = 'inline-block';
      }
      syncCookingDetails();
      if (btnClarifyConfirm) {
        btnClarifyConfirm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }

  const btnQ3Skip = document.getElementById('btn-q3-skip');
  if (btnQ3Skip) {
    btnQ3Skip.addEventListener('click', () => {
      oilAmount = '用量未知';
      q3Cards.forEach(c => c.classList.remove('selected'));
      if (q3Feedback) {
        q3Feedback.textContent = '已略過';
        q3Feedback.style.display = 'inline-block';
      }
      syncCookingDetails();
      if (btnClarifyConfirm) {
        btnClarifyConfirm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }

  function syncCookingDetails() {
    const nutri = getCalculatedNutrition();
    const expCookingText = document.getElementById('explanation-cooking-text');
    const basisCondDisplay = document.getElementById('basis-cond-display');
    const shareSeasoningInfo = document.getElementById('share-seasoning-info');
    const diaryDetailMethod = document.getElementById('diary-detail-method');
    const diaryDetailSeasoning = document.getElementById('diary-detail-seasoning');

    let cookingSummaryText = '';
    if (nutri.isAllSkipped) {
      cookingSummaryText = '烹調與調味資訊皆略過（保留未知）';
    } else {
      const parts = [];
      if (cookingMethod !== '烹調方式未知') parts.push(cookingMethod);
      else parts.push('烹調未知');

      if (soySauceAmount !== '用量未知') parts.push(`醬油：${soySauceAmount}`);
      else parts.push('醬油：未知');

      if (oilAmount !== '用量未知') parts.push(`用油：${oilAmount}`);
      else parts.push('用油：未知');

      cookingSummaryText = parts.join('、');
    }

    if (expCookingText) {
      expCookingText.textContent = `已補充：${cookingSummaryText}`;
    }

    if (basisCondDisplay) {
      basisCondDisplay.textContent = cookingSummaryText;
    }

    if (shareSeasoningInfo) {
      if (!nutri.isSufficient && cookingMethod === '烹調方式未知') {
        shareSeasoningInfo.textContent = '烹調方式：略過（未知）';
      } else {
        shareSeasoningInfo.textContent = `烹調方式：${cookingMethod}、醬油：${soySauceAmount}`;
      }
    }

    if (diaryDetailMethod) {
      diaryDetailMethod.textContent = `烹調方式：${cookingMethod}`;
    }
    if (diaryDetailSeasoning) {
      diaryDetailSeasoning.textContent = `調味資訊：醬油${soySauceAmount}、用油${oilAmount}`;
    }

    syncPortionToAllScreens();
  }

  if (btnClarifyConfirm) {
    btnClarifyConfirm.addEventListener('click', () => {
      syncCookingDetails();
      syncPortionToAllScreens();
      navigateTo('screen-explanation');
    });
  }

  // 6. 來源與說明
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

  // 7. 紀錄處理
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

  // 8. 分享預覽 (問題 2 核心修正)
  const btnOpenRecipientModal = document.getElementById('btn-open-recipient-modal');
  const btnConfirmRecipients = document.getElementById('btn-confirm-recipients');
  const btnCancelRecipients = document.getElementById('btn-cancel-recipients');
  const shareRecipientTitle = document.getElementById('share-recipient-title');

  if (btnOpenRecipientModal && modalRecipients) {
    btnOpenRecipientModal.addEventListener('click', () => {
      // 開啟前同步 checkbox 勾選狀態與 selectedRecipients
      const checkBoxes = modalRecipients.querySelectorAll('input[type="checkbox"]');
      checkBoxes.forEach(cb => {
        cb.checked = selectedRecipients.includes(normContact(cb.value));
      });
      modalRecipients.classList.add('active');
    });
  }

  if (btnCancelRecipients && modalRecipients) {
    btnCancelRecipients.addEventListener('click', () => {
      modalRecipients.classList.remove('active');
    });
  }

  if (btnConfirmRecipients && modalRecipients) {
    btnConfirmRecipients.addEventListener('click', () => {
      const checkedBoxes = modalRecipients.querySelectorAll('input[type="checkbox"]:checked');
      selectedRecipients = Array.from(checkedBoxes).map(cb => normContact(cb.value));
      if (selectedRecipients.length === 0) selectedRecipients = ['家人A'];

      if (shareRecipientTitle) {
        shareRecipientTitle.textContent = `接收者：${selectedRecipients.join('、')}`;
      }
      modalRecipients.classList.remove('active');
    });
  }

  // 確認分享按鈕：修正常式跳轉並聯動所有勾選對象 (問題 2)
  const btnShareConfirm = document.getElementById('btn-share-confirm');
  if (btnShareConfirm) {
    btnShareConfirm.addEventListener('click', () => {
      // 1. 將所有選中的對象存入 sharedMealContacts Set
      sharedMealContacts = new Set(selectedRecipients.map(normContact));

      // 2. 更新聊天室聯絡人清單標籤
      updateChatListBadges();

      // 3. 設定聊天室上方的成功分享通知橫幅
      const banner = document.getElementById('chat-list-share-banner');
      if (banner) {
        const names = selectedRecipients.join('、');
        banner.innerHTML = `<div>✓ 已成功向 <strong>${names}</strong> 分享餐食！</div><div style="font-size: 13px; font-weight: normal; color: #047857;">請點選下方聯絡人查看個別對話內容</div>`;
        banner.style.display = 'flex';
      }

      // 4. 導向聊天室聯絡人清單頁面，讓使用者清楚看見各對象並可個別點進去查看 (解決直接跳到家人A的問題)
      navigateTo('screen-chat-list');
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

  // 9. 餐食日記詳細資料
  const detailDateTitle = document.getElementById('detail-date-title');
  const detailPhotoImg = document.getElementById('detail-photo-img');
  const diaryDetailDishes = document.getElementById('diary-detail-dishes');
  const diaryDetailPortion = document.getElementById('diary-detail-portion');
  const diaryDetailMethod = document.getElementById('diary-detail-method');
  const diaryDetailSeasoning = document.getElementById('diary-detail-seasoning');
  const diaryDetailBasis = document.getElementById('diary-detail-basis');
  const diaryDetailSuggestion = document.getElementById('diary-detail-suggestion');

  const diaryNutriCal = document.getElementById('diary-nutri-cal');
  const diaryNutriProtein = document.getElementById('diary-nutri-protein');
  const diaryNutriSodium = document.getElementById('diary-nutri-sodium');

  const diaryDetailButtons = document.querySelectorAll('.btn-view-diary-detail');
  diaryDetailButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const dateKey = e.currentTarget.getAttribute('data-date') || '11/10';
      const record = diaryDatabase[dateKey] || diaryDatabase['11/10'];

      if (detailDateTitle) detailDateTitle.textContent = record.title;
      if (detailPhotoImg) detailPhotoImg.src = record.img;
      if (diaryDetailDishes) diaryDetailDishes.textContent = record.dishes;
      if (diaryDetailPortion) diaryDetailPortion.textContent = record.portion();
      if (diaryDetailMethod) diaryDetailMethod.textContent = record.method();
      if (diaryDetailSeasoning) diaryDetailSeasoning.textContent = record.seasoning();
      if (diaryDetailBasis) diaryDetailBasis.textContent = record.basis;
      if (diaryDetailSuggestion) diaryDetailSuggestion.textContent = record.suggestion;

      const nutri = record.getNutrition();
      if (diaryNutriCal) diaryNutriCal.textContent = nutri.calories;
      if (diaryNutriProtein) diaryNutriProtein.textContent = nutri.protein;
      if (diaryNutriSodium) diaryNutriSodium.textContent = nutri.sodium;

      navigateTo('screen-diary-detail');
    });
  });

  const btnBackToDiary = document.getElementById('btn-back-to-diary');
  if (btnBackToDiary) {
    btnBackToDiary.addEventListener('click', () => {
      navigateTo('screen-diary');
    });
  }

  // 10. 聊天室聯絡人點擊 (問題 2 核心修正)
  const contactItems = document.querySelectorAll('.contact-list-item');
  contactItems.forEach(item => {
    item.addEventListener('click', (e) => {
      const targetContact = normContact(e.currentTarget.getAttribute('data-contact')) || '家人A';
      activeContact = targetContact;
      navigateTo('screen-chat-detail');
    });
  });

  // 11. 聊天室頁面動態渲染 (問題 2 核心聯動：完美支援 家人A、家人C 與未勾選之 家人B)
  const chatMessagesContainer = document.getElementById('chat-messages-container');
  const chatPerspectiveBadge = document.getElementById('chat-perspective-badge');
  const familyInputControls = document.getElementById('family-input-controls');
  const elderInputControls = document.getElementById('elder-input-controls');
  const aiInputControls = document.getElementById('ai-input-controls');
  const chatInputText = document.getElementById('chat-input-text');
  const chatElderInputText = document.getElementById('chat-elder-input-text');
  const chatAiInputText = document.getElementById('chat-ai-input-text');

  function renderChatDetailView() {
    if (!chatMessagesContainer) return;
    chatMessagesContainer.innerHTML = '';

    const currentContactNorm = normContact(activeContact);

    if (headerTitle) {
      headerTitle.textContent = currentContactNorm;
    }

    // 檢查此對象是否在分享名單中（問題 2：比對去除空白後的乾淨字串）
    const hasSharedToThisContact = sharedMealContacts.has(currentContactNorm);
    const nutri = getCalculatedNutrition();
    const seasoningText = nutri.isSufficient ? `烹調方式：${cookingMethod}（醬油：${soySauceAmount}）` : '烹調與調味：資訊略過（保留未知）';

    if (currentContactNorm === 'AI助手') {
      if (chatPerspectiveBadge) {
        chatPerspectiveBadge.textContent = '長者端｜AI 健康飲食助手';
      }

      if (familyInputControls) familyInputControls.style.display = 'none';
      if (elderInputControls) elderInputControls.style.display = 'none';
      if (aiInputControls) aiInputControls.style.display = 'block';

      if (!hasSharedToThisContact) {
        // 未分享至 AI助手
        const emptyCard = document.createElement('div');
        emptyCard.className = 'chat-empty-state';
        emptyCard.innerHTML = `
          <div class="empty-icon">🤖</div>
          <div class="card-text text-center" style="font-weight: 800; font-size: 19px;">尚未向 AI 助手發送餐食分析</div>
          <p class="card-text text-center" style="font-size: 15px; color: #64748B;">若於分享預覽勾選 AI 助手，將可在此獲得專屬飲食衛教建議。</p>
        `;
        chatMessagesContainer.appendChild(emptyCard);
      } else {
        // 有勾選分享至 AI助手
        const userBubble = document.createElement('div');
        userBubble.className = 'chat-bubble bubble-sent';
        userBubble.innerHTML = `
          <div class="chat-bubble-sender">我（林陳桂華）</div>
          <div class="card-text" style="font-weight: 800;">分享內容：餐食照片與文字</div>
          <div class="food-photo-card" style="margin: 8px 0;">
            <img src="meal.jpg" alt="真實餐食照片" style="height: 160px;">
          </div>
          <div class="card-text" style="font-weight: 800;">已確認：豆腐、青菜、${chosenPortion}</div>
          <div class="card-text" style="font-size: 15px; color: #4B5563;">${seasoningText}</div>
        `;
        chatMessagesContainer.appendChild(userBubble);

        let aiAdviceContent = '';
        if (nutri.isSufficient) {
          aiAdviceContent = `
            桂華女士您好！為您查詢今日餐食紀錄：<br><br>
            您今天記錄的【豆腐、青菜、${chosenPortion}】整體搭配相當健康美味！<br>
            • <strong>豆腐：</strong>提供豐富優質大豆植物蛋白與鈣質，質地軟嫩好吞嚥，很適合長輩日常補充體力。<br>
            • <strong>青菜：</strong>空心菜富含膳食纖維與微量元素，有助促進腸胃蠕動。<br>
            • <strong>溫馨提醒：</strong>注意到您採用${cookingMethod}料理。若有搭配醬油（${soySauceAmount}），建議沾食或另行分裝，既能保留美味又能適度調控鹽分攝取喔！<br><br>
            <span style="font-size: 13px; color: #4B5563;">【資料來源：衛生福利部國民健康署「高齡營養健康指引 三好一巧原則」與台灣食品營養成分資料庫】</span>
          `;
        } else {
          aiAdviceContent = `
            桂華女士您好！為您查詢今日餐食紀錄：<br><br>
            您今天記錄的【豆腐、青菜、${chosenPortion}】非常清爽營養！<br>
            • <strong>豆腐：</strong>提供豐富優質大豆植物蛋白與鈣質，質地軟嫩好吞嚥，很適合長輩日常補充體力。<br>
            • <strong>青菜：</strong>空心菜富含膳食纖維與微量元素，有助促進腸道健康。<br>
            • <strong>調味說明：</strong>雖然調味品用量選擇略過，系統保留未知不予妄斷。日常烹調仍建議少鹽、少醬汁，清淡原味最健康喔！<br><br>
            <span style="font-size: 13px; color: #4B5563;">【資料來源：衛生福利部國民健康署「高齡營養健康指引 三好一巧原則」與台灣食品營養成分資料庫】</span>
          `;
        }

        const aiReplyBubble = document.createElement('div');
        aiReplyBubble.className = 'chat-bubble bubble-received';
        aiReplyBubble.innerHTML = `
          <div class="chat-bubble-sender" style="color: #047857; font-weight: 900;">AI助手</div>
          <div class="card-text" style="line-height: 1.6;">${aiAdviceContent}</div>
        `;
        chatMessagesContainer.appendChild(aiReplyBubble);
      }

    } else {
      // 聯絡人為一般家人 (家人A, 家人B, 家人C)
      // Bug 1 fix: 優先顯示 AI 潤飾後的回覆，若無則顯示原始回覆
      const replyText = refinedReplies[currentContactNorm] || familyReplies[currentContactNorm] || '媽，今天吃得好清淡健康！';

      if (currentRole === 'elder') {
        // 長者端視角
        if (chatPerspectiveBadge) {
          chatPerspectiveBadge.textContent = `長者端視角｜林陳桂華 女士 （與${currentContactNorm}對話中）`;
        }

        if (familyInputControls) familyInputControls.style.display = 'none';
        if (elderInputControls) elderInputControls.style.display = 'block';
        if (aiInputControls) aiInputControls.style.display = 'none';

        if (!hasSharedToThisContact) {
          // 未勾選此對象，長者端顯示尚未分享
          const emptyCard = document.createElement('div');
          emptyCard.className = 'chat-empty-state';
          emptyCard.innerHTML = `
            <div class="empty-icon">📭</div>
            <div class="card-text text-center" style="font-weight: 800; font-size: 19px;">尚未向 ${currentContactNorm} 分享餐食紀錄</div>
            <p class="card-text text-center" style="font-size: 15px; color: #64748B;">長者保有分享決定權，未勾選分享的對象不會收到此餐食資訊。</p>
            <div class="card-badge" style="margin: 10px auto 0; display: table;">自願家庭分享・保留隱私</div>
          `;
          chatMessagesContainer.appendChild(emptyCard);
        } else {
          // 有勾選分享 (例如 家人A 或 家人C)
          const sentBubble = document.createElement('div');
          sentBubble.className = 'chat-bubble bubble-sent';
          sentBubble.innerHTML = `
            <div class="chat-bubble-sender">我（林陳桂華）</div>
            <div class="card-text" style="font-weight: 800;">分享內容：餐食照片與文字</div>
            <div class="food-photo-card" style="margin: 8px 0;">
              <img src="meal.jpg" alt="真實餐食照片" style="height: 160px;">
            </div>
            <div class="card-text" style="font-weight: 800;">已確認：豆腐、青菜、${chosenPortion}</div>
            <div class="card-text" style="font-size: 15px; color: #4B5563;">${seasoningText}</div>
          `;
          chatMessagesContainer.appendChild(sentBubble);

          const receivedBubble = document.createElement('div');
          receivedBubble.className = 'chat-bubble bubble-received';
          receivedBubble.innerHTML = `
            <div class="chat-bubble-sender">${currentContactNorm}</div>
            <div class="card-text">${replyText}</div>
          `;
          chatMessagesContainer.appendChild(receivedBubble);
        }

      } else {
        // 家屬端視角
        if (chatPerspectiveBadge) {
          chatPerspectiveBadge.textContent = `家屬端視角｜林正義 先生 （${currentContactNorm}）`;
        }

        if (!hasSharedToThisContact) {
          // 未勾選此家屬，家屬端不應收到照片
          if (familyInputControls) familyInputControls.style.display = 'none';
          if (elderInputControls) elderInputControls.style.display = 'none';
          if (aiInputControls) aiInputControls.style.display = 'none';

          const emptyCard = document.createElement('div');
          emptyCard.className = 'chat-empty-state';
          emptyCard.innerHTML = `
            <div class="empty-icon">📭</div>
            <div class="card-text text-center" style="font-weight: 800; font-size: 19px;">長者目前尚未向您分享今日餐食</div>
            <p class="card-text text-center" style="font-size: 15px; color: #64748B;">系統以長者自主權為核心，僅在長者主動勾選分享時才於此處呈現。</p>
            <div class="card-badge" style="margin: 10px auto 0; display: table;">預設私人紀錄・未收到分享</div>
          `;
          chatMessagesContainer.appendChild(emptyCard);
        } else {
          // 有收到長者分享
          if (familyInputControls) familyInputControls.style.display = 'block';
          if (elderInputControls) elderInputControls.style.display = 'none';
          if (aiInputControls) aiInputControls.style.display = 'none';

          const elderBubble = document.createElement('div');
          elderBubble.className = 'chat-bubble bubble-received';
          elderBubble.innerHTML = `
            <div class="chat-bubble-sender">長者（林陳桂華 女士）</div>
            <div class="card-text" style="font-weight: 800;">分享內容：餐食照片與文字</div>
            <div class="food-photo-card" style="margin: 8px 0;">
              <img src="meal.jpg" alt="真實餐食照片" style="height: 160px;">
            </div>
            <div class="card-text" style="font-weight: 800;">已確認：豆腐、青菜、${chosenPortion}</div>
            <div class="card-text" style="font-size: 15px; color: #4B5563;">${seasoningText}</div>
          `;
          chatMessagesContainer.appendChild(elderBubble);

          const familySentBubble = document.createElement('div');
          familySentBubble.className = 'chat-bubble bubble-sent';
          familySentBubble.innerHTML = `
            <div class="chat-bubble-sender">我（${currentContactNorm}）</div>
            <div class="card-text">${replyText}</div>
          `;
          chatMessagesContainer.appendChild(familySentBubble);
        }
      }
    }

    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
  }

  const btnDirectReply = document.getElementById('btn-direct-reply');
  const btnAiRefine = document.getElementById('btn-ai-refine');

  if (btnDirectReply) {
    btnDirectReply.addEventListener('click', () => {
      const text = chatInputText.value.trim() || '不要再淋醬了';
      familyReplies[normContact(activeContact)] = text;
      renderChatDetailView();
      chatInputText.value = '';
    });
  }

  if (btnAiRefine) {
    btnAiRefine.addEventListener('click', () => {
      // Bug 2 fix: load the current contact's original reply into the modal
      const contactKey = normContact(activeContact);
      const origText = familyReplies[contactKey] || '';

      // Generate a simple AI-refined version for this contact
      const aiDraftMap = {
        '家人A': '這餐要不要試試少加一點醬？',
        '家人B': '媽，今天吃得好清淡健康！希望您每天都吃得這麼均衡喔！',
        '家人C': '阿嬤，記得湯不要喝太鹹喔！您健康我們才放心！'
      };
      const draftText = aiDraftMap[contactKey] || origText;

      // Update modal content to show correct contact's text
      if (compareOrigElem) compareOrigElem.textContent = `原文：${origText}`;
      if (compareDraftElem) compareDraftElem.textContent = `草稿：${draftText}`;

      // Reset border highlight
      if (compareDraftElem) compareDraftElem.style.border = '2px solid #059669';
      if (compareOrigElem) compareOrigElem.style.border = 'none';

      // Pre-select draft
      currentAiDraftText = draftText;
      currentChosenText = draftText;
      if (chatInputText) chatInputText.value = currentChosenText;

      if (modalAiRefine) modalAiRefine.classList.add('active');
    });
  }

  const btnElderSendReply = document.getElementById('btn-elder-send-reply');
  const btnElderVoiceReply = document.getElementById('btn-elder-voice-reply');
  if (btnElderSendReply) {
    btnElderSendReply.addEventListener('click', () => {
      const text = chatElderInputText.value.trim();
      if (!text) return;
      const b = document.createElement('div');
      b.className = 'chat-bubble bubble-sent';
      b.innerHTML = `<div class="chat-bubble-sender">我（林陳桂華）</div><div class="card-text">${text}</div>`;
      chatMessagesContainer.appendChild(b);
      chatElderInputText.value = '';
      chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
    });
  }

  if (btnElderVoiceReply) {
    btnElderVoiceReply.addEventListener('click', () => {
      chatElderInputText.value = '今天多吃了一點空心菜，精神很好！';
    });
  }

  const btnAiAskReply = document.getElementById('btn-ai-ask-reply');
  if (btnAiAskReply) {
    btnAiAskReply.addEventListener('click', () => {
      const text = chatAiInputText.value.trim() || '豆腐跟青菜可以天天吃嗎？';
      const userQ = document.createElement('div');
      userQ.className = 'chat-bubble bubble-sent';
      userQ.innerHTML = `<div class="chat-bubble-sender">我（林陳桂華）</div><div class="card-text">${text}</div>`;
      chatMessagesContainer.appendChild(userQ);

      const aiAns = document.createElement('div');
      aiAns.className = 'chat-bubble bubble-received';
      aiAns.innerHTML = `
        <div class="chat-bubble-sender" style="color: #047857; font-weight: 900;">AI助手</div>
        <div class="card-text">
          桂華女士，豆腐與青菜是非常理想的長者日常食物！天天吃是很好的，只要維持烹調少油少鹽，再搭配不同顏色的蔬菜（如南瓜、胡蘿蔔），營養會更加均衡喔！<br>
          <span style="font-size: 13px; color: #4B5563;">【資料來源：國民健康署『我的餐盤』飲食原則】</span>
        </div>
      `;
      chatMessagesContainer.appendChild(aiAns);
      chatAiInputText.value = '';
      chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
    });
  }

  const btnSelectDraft = document.getElementById('btn-select-draft');
  const btnSelectOriginal = document.getElementById('btn-select-original');
  const btnModalConfirmSend = document.getElementById('btn-modal-confirm-send');
  const btnModalCancel = document.getElementById('btn-modal-cancel');
  const compareDraftElem = document.getElementById('compare-draft-box');
  const compareOrigElem = document.getElementById('compare-orig-box');

  if (btnSelectDraft) {
    btnSelectDraft.addEventListener('click', () => {
      // 切換到 AI 草稿版本
      currentChosenText = currentAiDraftText;
      if (compareDraftElem) compareDraftElem.style.border = '2px solid #059669';
      if (compareOrigElem) compareOrigElem.style.border = 'none';
      if (chatInputText) chatInputText.value = currentChosenText;
    });
  }

  if (btnSelectOriginal) {
    btnSelectOriginal.addEventListener('click', () => {
      // Revert to the current contact's original reply text
      const contactKey = normContact(activeContact);
      currentChosenText = familyReplies[contactKey] || '';
      if (compareOrigElem) compareOrigElem.style.border = '2px solid #DC2626';
      if (compareDraftElem) compareDraftElem.style.border = 'none';
      if (chatInputText) chatInputText.value = currentChosenText;
    });
  }

  if (btnModalConfirmSend) {
    btnModalConfirmSend.addEventListener('click', () => {
      // 儲存 AI 潤飾回覆至 refinedReplies，不覆蓋原始回覆
      refinedReplies[normContact(activeContact)] = currentChosenText;
      renderChatDetailView();
      if (modalAiRefine) modalAiRefine.classList.remove('active');
      if (chatInputText) chatInputText.value = '';
    });
  }

  if (btnModalCancel) {
    btnModalCancel.addEventListener('click', () => {
      if (modalAiRefine) modalAiRefine.classList.remove('active');
    });
  }

  // 初始化狀態
  updatePortionState(0);
  resetClarifyQuestions();
  updateChatListBadges();
  navigateTo('screen-login', false);
});
