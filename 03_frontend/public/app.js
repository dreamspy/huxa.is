(function () {
  "use strict";

  const APP_VERSION = "0.1.12";

  const isLocal = window.location.hostname === "localhost";
  const API_BASE = isLocal ? "http://localhost:8000" : "";

  // DOM refs
  const stateIdle = document.getElementById("state-idle");
  const stateCategory = document.getElementById("state-category");
  const stateCompose = document.getElementById("state-compose");
  const stateSubmitting = document.getElementById("state-submitting");
  const stateHistory = document.getElementById("state-history");
  const stateDiaryDate = document.getElementById("state-diary-date");
  const stateDiaryLoading = document.getElementById("state-diary-loading");
  const stateDiarySummary = document.getElementById("state-diary-summary");
  const stateDiaryStep = document.getElementById("state-diary-step");
  const stateDiaryReview = document.getElementById("state-diary-review");
  const stateDiarySaving = document.getElementById("state-diary-saving");
  const stateDiaryBulkScales = document.getElementById("state-diary-bulk-scales");
  const stateDiaryBulkText = document.getElementById("state-diary-bulk-text");
  const stateDiaryBulkParsing = document.getElementById("state-diary-bulk-parsing");
  const stateQueue = document.getElementById("state-queue");
  const composeType = document.getElementById("compose-type");
  const inputDatetime = document.getElementById("input-datetime");
  const inputText = document.getElementById("input-text");
  const toast = document.getElementById("toast");
  const tokenDialog = document.getElementById("token-dialog");
  const tokenInput = document.getElementById("token-input");

  let selectedType = null;
  var editingEventId = null;
  var diaryBulkMode = false;

  // --- State transitions ---

  var allStates = [
    stateIdle, stateCategory, stateCompose, stateSubmitting,
    stateDiaryDate, stateDiaryLoading, stateDiarySummary,
    stateDiaryStep, stateDiaryReview, stateDiarySaving,
    stateDiaryBulkScales, stateDiaryBulkText, stateDiaryBulkParsing,
    stateHistory, stateQueue,
  ];

  function showState(section) {
    allStates.forEach(function (s) {
      s.classList.add("hidden");
    });
    section.classList.remove("hidden");
  }

  function resetToIdle() {
    selectedType = null;
    editingEventId = null;
    diaryBulkMode = false;
    inputText.value = "";
    showState(stateIdle);
  }

  // --- Token management ---

  function getToken() {
    return localStorage.getItem("mnemo_token") || (isLocal ? "dev-token" : null);
  }

  function setToken(token) {
    localStorage.setItem("mnemo_token", token);
  }

  function promptForToken() {
    tokenInput.value = getToken() || "";
    tokenDialog.showModal();
  }

  // --- Toast ---

  let toastTimer = null;

  function showToast(message, type) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.className = "toast " + type;
    toastTimer = setTimeout(function () {
      toast.className = "toast hidden";
    }, 3000);
  }

  // --- UUID generation (fallback for non-secure contexts) ---

  function generateUUID() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, function (c) {
      return (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16);
    });
  }

  // --- Offline queue ---

  var QUEUE_KEY = "mnemo_queue";

  function getQueue() {
    try {
      return JSON.parse(localStorage.getItem(QUEUE_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function saveQueue(queue) {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }

  function addToQueue(kind, payload) {
    var queue = getQueue();
    queue.push({
      id: generateUUID(),
      created_at: new Date().toISOString(),
      kind: kind,
      status: "pending",
      error: null,
      payload: payload,
    });
    saveQueue(queue);
    updateQueueBadge();
  }

  function removeFromQueue(id) {
    var queue = getQueue().filter(function (item) { return item.id !== id; });
    saveQueue(queue);
    updateQueueBadge();
  }

  function getQueueItemLabel(item) {
    if (item.kind === "event") {
      return (item.payload.type || "Event") + ": " + (item.payload.text || "").slice(0, 40);
    }
    if (item.kind === "diary") {
      return "Diary — " + (item.payload.date || "");
    }
    if (item.kind === "diary_bulk") {
      return "Diary (quick) — " + (item.payload.date || "");
    }
    return item.kind;
  }

  function updateQueueBadge() {
    var queue = getQueue();
    var btn = document.getElementById("btn-queue");
    var count = document.getElementById("queue-badge-count");
    if (queue.length > 0) {
      count.textContent = queue.length;
      btn.classList.remove("hidden");
    } else {
      btn.classList.add("hidden");
    }
  }

  function renderQueueScreen() {
    var list = document.getElementById("queue-list");
    list.innerHTML = "";
    var queue = getQueue();

    if (queue.length === 0) {
      list.innerHTML = '<p class="history-empty">Queue is empty.</p>';
      showState(stateQueue);
      return;
    }

    queue.forEach(function (item) {
      var row = document.createElement("div");
      row.className = "queue-item";

      var info = document.createElement("div");
      info.className = "queue-item-info";

      var label = document.createElement("div");
      label.className = "queue-item-label";
      label.textContent = getQueueItemLabel(item);

      var meta = document.createElement("div");
      meta.className = "queue-item-meta";
      if (item.status === "failed" && item.error) {
        meta.classList.add("failed");
        meta.textContent = "Failed: " + item.error;
      } else {
        meta.textContent = item.status.charAt(0).toUpperCase() + item.status.slice(1);
      }

      info.appendChild(label);
      info.appendChild(meta);
      row.appendChild(info);

      var del = document.createElement("button");
      del.className = "queue-item-delete";
      del.textContent = "\u00D7";
      del.title = "Remove";
      del.addEventListener("click", function () {
        removeFromQueue(item.id);
        renderQueueScreen();
      });
      row.appendChild(del);

      list.appendChild(row);
    });

    showState(stateQueue);
  }

  async function processQueue() {
    var queue = getQueue();
    if (queue.length === 0) return;

    var token = getToken();
    if (!token) return;

    var headers = {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    };

    for (var i = 0; i < queue.length; i++) {
      var item = queue[i];
      if (item.status !== "pending" && item.status !== "failed") continue;

      // Mark syncing
      item.status = "syncing";
      item.error = null;
      saveQueue(queue);

      try {
        if (item.kind === "event") {
          var res = await fetch(API_BASE + "/events", {
            method: "POST",
            headers: headers,
            body: JSON.stringify(item.payload),
          });
          if (!res.ok) {
            var body = await res.json().catch(function () { return {}; });
            throw new Error(body.detail || "HTTP " + res.status);
          }
        } else if (item.kind === "diary") {
          var res = await fetch(API_BASE + "/diary", {
            method: "POST",
            headers: headers,
            body: JSON.stringify(item.payload),
          });
          if (!res.ok) {
            var body = await res.json().catch(function () { return {}; });
            throw new Error(body.detail || "HTTP " + res.status);
          }
        } else if (item.kind === "diary_bulk") {
          // Step 1: parse text
          var questions = item.payload.questions;
          var parseRes = await fetch(API_BASE + "/diary/parse-text", {
            method: "POST",
            headers: headers,
            body: JSON.stringify({ raw_text: item.payload.raw_text, questions: questions }),
          });
          if (!parseRes.ok) {
            var body = await parseRes.json().catch(function () { return {}; });
            throw new Error(body.detail || "HTTP " + parseRes.status);
          }
          var parsed = await parseRes.json();

          // Step 2: merge scale answers with parsed text answers
          var mergedAnswers = Object.assign({}, item.payload.scale_answers);
          Object.keys(parsed.answers).forEach(function (k) {
            if (parsed.answers[k]) {
              mergedAnswers[k] = parsed.answers[k];
            }
          });

          // Step 3: save diary
          var saveRes = await fetch(API_BASE + "/diary", {
            method: "POST",
            headers: headers,
            body: JSON.stringify({ date: item.payload.date, answers: mergedAnswers }),
          });
          if (!saveRes.ok) {
            var body = await saveRes.json().catch(function () { return {}; });
            throw new Error(body.detail || "HTTP " + saveRes.status);
          }
        }

        // Success — remove from queue
        queue.splice(i, 1);
        i--;
        saveQueue(queue);
      } catch (err) {
        if (err instanceof TypeError) {
          // Network failure — stop processing, revert to pending
          item.status = "pending";
          saveQueue(queue);
          break;
        }
        // Server error — mark failed, continue
        item.status = "failed";
        item.error = err.message || "Unknown error";
        saveQueue(queue);
      }
    }

    updateQueueBadge();
  }

  // --- Event submission ---

  async function submitEvent(nextType) {
    var text = inputText.value.trim();
    if (!text) {
      showToast("Text is required", "error");
      return;
    }

    var token = getToken();
    if (!token) {
      promptForToken();
      return;
    }

    showState(stateSubmitting);

    var clientTs;
    if (inputDatetime.value) {
      clientTs = new Date(inputDatetime.value).toISOString().replace(/\.\d{3}Z$/, "Z");
    } else {
      clientTs = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    }

    var isEditing = !!editingEventId;
    var eventId = isEditing ? editingEventId : generateUUID();

    var event = {
      id: eventId,
      client_timestamp: clientTs,
      type: selectedType,
      text: text,
      metrics: {},
      meta: { version: 1 },
    };

    function onSuccess() {
      editingEventId = null;
      if (nextType) {
        showToast("Logged — next: " + nextType, "success");
        selectedType = nextType;
        composeType.textContent = nextType;
        inputText.value = "";
        setComposeDateTime();
        showState(stateCompose);
        inputText.focus();
      } else {
        showToast(isEditing ? "Updated" : "Logged", "success");
        resetToIdle();
      }
    }

    try {
      var url = isEditing ? API_BASE + "/events/" + eventId : API_BASE + "/events";
      var res = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify(event),
      });

      if (!res.ok) {
        var body = await res.json().catch(function () { return {}; });
        throw new Error(body.detail || "HTTP " + res.status);
      }

      onSuccess();
    } catch (err) {
      if (err instanceof TypeError) {
        addToQueue("event", event);
        onSuccess();
        return;
      }
      showToast(err.message || "Network error", "error");
      showState(stateCompose);
    }
  }

  // --- Event listeners ---

  document.getElementById("btn-home").addEventListener("click", resetToIdle);

  document.getElementById("btn-log").addEventListener("click", function () {
    if (!getToken()) {
      promptForToken();
      return;
    }
    showState(stateCategory);
  });

  function setComposeDateTime() {
    var now = new Date();
    // datetime-local expects YYYY-MM-DDTHH:MM
    var y = now.getFullYear();
    var mo = String(now.getMonth() + 1).padStart(2, "0");
    var d = String(now.getDate()).padStart(2, "0");
    var hh = String(now.getHours()).padStart(2, "0");
    var mm = String(now.getMinutes()).padStart(2, "0");
    inputDatetime.value = y + "-" + mo + "-" + d + "T" + hh + ":" + mm;
  }

  document.querySelectorAll("#state-category .btn-category").forEach(function (btn) {
    btn.addEventListener("click", function () {
      editingEventId = null;
      selectedType = btn.dataset.type;
      document.getElementById("compose-label").innerHTML = "New <span id=\"compose-type\">" + selectedType + "</span>";
      setComposeDateTime();
      showState(stateCompose);
      inputText.focus();
    });
  });

  document.querySelectorAll(".btn-submit-new").forEach(function (btn) {
    btn.addEventListener("click", function () {
      submitEvent(btn.dataset.type);
    });
  });

  document.getElementById("btn-back-category").addEventListener("click", resetToIdle);

  document.getElementById("btn-back-compose").addEventListener("click", function () {
    if (editingEventId) {
      editingEventId = null;
      showState(stateHistory);
      fetchHistory();
    } else {
      showState(stateCategory);
    }
  });

  document.getElementById("btn-submit").addEventListener("click", function () {
    submitEvent();
  });

  document.getElementById("btn-save-token").addEventListener("click", function (e) {
    e.preventDefault();
    var val = tokenInput.value.trim();
    if (val) {
      setToken(val);
      tokenDialog.close();
      showToast("Token saved", "success");
    }
  });

  // Ctrl/Cmd+Enter to submit from compose
  inputText.addEventListener("keydown", function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      submitEvent();
    }
  });

  // --- Query ---

  var queryInput = document.getElementById("query-input");
  var queryAnswer = document.getElementById("query-answer");

  async function submitQuery() {
    var question = queryInput.value.trim();
    if (!question) return;

    var token = getToken();
    if (!token) {
      promptForToken();
      return;
    }

    queryAnswer.textContent = "Thinking...";
    queryAnswer.className = "query-answer loading";

    try {
      var res = await fetch(API_BASE + "/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({ question: question }),
      });

      if (!res.ok) {
        var body = await res.json().catch(function () { return {}; });
        throw new Error(body.detail || "HTTP " + res.status);
      }

      var data = await res.json();
      queryAnswer.textContent = data.answer;
      queryAnswer.className = "query-answer";
    } catch (err) {
      queryAnswer.textContent = "Error: " + (err.message || "Network error");
      queryAnswer.className = "query-answer";
    }
  }

  document.getElementById("btn-ask").addEventListener("click", submitQuery);

  queryInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      submitQuery();
    }
  });

  // --- Diary ---

  var DIARY_QUESTIONS = [
    { key: "sleep", label: "Sleep Quality", question: "How was your sleep quality last night?", type: "scale", min: 1, max: 10 },
    { key: "headaches", label: "Headaches", question: "How are your headaches today?", type: "scale", min: 1, max: 10 },
    { key: "energy", label: "Energy", question: "How is your energy level today?", type: "scale", min: 1, max: 10 },
    { key: "gut", label: "Gut Status", question: "How is your gut feeling today?", type: "text" },
    { key: "physical", label: "Physical Well-Being", question: "How is your general physical well-being today?", type: "text" },
    { key: "hip_pain", label: "Hip Pain", question: "How is your hip pain today?", type: "scale", min: 1, max: 10 },
    { key: "mental", label: "Mental / Emotional", question: "How is your mental or emotional state today?", type: "text" },
    { key: "life", label: "Life / Events", question: "What is happening in your life or on your mind today?", type: "text" },
    { key: "activity", label: "Physical Activity", question: "What physical activity did you do today, if any?", type: "text" },
    { key: "gratitude", label: "Gratitude / Small Win", question: "What is one thing you're grateful for or a small win from today?", type: "text" },
  ];

  var SCALE_QUESTIONS = DIARY_QUESTIONS.filter(function (q) { return q.type === "scale"; });
  var TEXT_QUESTIONS = DIARY_QUESTIONS.filter(function (q) { return q.type === "text"; });

  var diaryDate = "";
  var diaryAnswers = {};
  var diaryStepIndex = 0;
  var activeScaleKeyHandler = null;

  function todayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  function yesterdayStr() {
    var d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }

  // Diary: open date picker
  document.getElementById("btn-diary").addEventListener("click", function () {
    if (!getToken()) {
      promptForToken();
      return;
    }
    var dateInput = document.getElementById("diary-date-input");
    dateInput.value = todayStr();
    showState(stateDiaryDate);
  });

  document.getElementById("btn-diary-yesterday").addEventListener("click", function () {
    document.getElementById("diary-date-input").value = yesterdayStr();
  });

  document.getElementById("btn-diary-today").addEventListener("click", function () {
    document.getElementById("diary-date-input").value = todayStr();
  });

  document.getElementById("btn-diary-back-date").addEventListener("click", resetToIdle);

  // Diary: start — fetch summary + existing entry
  document.getElementById("btn-diary-start").addEventListener("click", async function () {
    diaryDate = document.getElementById("diary-date-input").value;
    if (!diaryDate) {
      showToast("Pick a date", "error");
      return;
    }

    diaryAnswers = {};
    diaryStepIndex = 0;
    showState(stateDiaryLoading);

    var token = getToken();
    var headers = { Authorization: "Bearer " + token };

    try {
      var [entryRes, summaryRes] = await Promise.all([
        fetch(API_BASE + "/diary/" + diaryDate, { headers: headers }),
        fetch(API_BASE + "/diary/" + diaryDate + "/summary", { headers: headers }),
      ]);

      // Pre-fill answers if existing entry
      var hasExisting = false;
      if (entryRes.ok) {
        var entryData = await entryRes.json();
        diaryAnswers = entryData.answers || {};
        hasExisting = Object.keys(diaryAnswers).length > 0;
      }

      // Show summary
      var summaryText = "No events logged for this date.";
      if (summaryRes.ok) {
        var summaryData = await summaryRes.json();
        summaryText = summaryData.summary;
      }

      document.getElementById("diary-summary-text").textContent = summaryText;
      renderDiarySummaryActions(hasExisting);
      showState(stateDiarySummary);
    } catch (err) {
      if (err instanceof TypeError) {
        // Offline — proceed without summary or pre-filled answers
        document.getElementById("diary-summary-text").textContent = "Offline — summary not available.";
        renderDiarySummaryActions(false);
        showState(stateDiarySummary);
        return;
      }
      showToast(err.message || "Network error", "error");
      showState(stateDiaryDate);
    }
  });

  function renderDiarySummaryActions(hasExisting) {
    var existingDiv = document.getElementById("diary-existing-entry");
    var newActions = document.getElementById("diary-summary-new");
    var existingActions = document.getElementById("diary-summary-existing");
    var label = document.getElementById("diary-summary-label");

    existingDiv.innerHTML = "";

    if (hasExisting) {
      label.textContent = "Existing Entry";
      SCALE_QUESTIONS.concat(TEXT_QUESTIONS).forEach(function (q) {
        var ans = diaryAnswers[q.key];
        if (ans === undefined || ans === "") return;
        var item = document.createElement("div");
        item.className = "diary-review-item";
        var lbl = document.createElement("div");
        lbl.className = "review-label";
        lbl.textContent = q.label;
        var val = document.createElement("div");
        val.className = "review-value";
        val.textContent = ans;
        item.appendChild(lbl);
        item.appendChild(val);
        existingDiv.appendChild(item);
      });
      existingDiv.classList.remove("hidden");
      newActions.classList.add("hidden");
      existingActions.classList.remove("hidden");
    } else {
      label.textContent = "Today's Events Summary";
      existingDiv.classList.add("hidden");
      newActions.classList.remove("hidden");
      existingActions.classList.add("hidden");
    }
  }

  // Diary: continue from summary to first question (step-by-step)
  document.getElementById("btn-diary-continue").addEventListener("click", function () {
    diaryBulkMode = false;
    diaryStepIndex = 0;
    renderDiaryStep();
  });

  // Diary: quick entry (bulk mode)
  document.getElementById("btn-diary-quick").addEventListener("click", function () {
    diaryBulkMode = true;
    renderBulkScales();
  });

  // Diary: existing entry — keep as-is
  document.getElementById("btn-diary-keep").addEventListener("click", resetToIdle);

  // Diary: existing entry — edit
  document.getElementById("btn-diary-edit").addEventListener("click", function () {
    diaryBulkMode = true;
    renderBulkScales();
  });

  // --- Bulk scales ---

  function renderBulkScales() {
    var list = document.getElementById("bulk-scales-list");
    list.innerHTML = "";

    SCALE_QUESTIONS.forEach(function (q) {
      var row = document.createElement("div");
      row.className = "bulk-scale-row";

      var label = document.createElement("div");
      label.className = "bulk-scale-label";
      label.textContent = q.label;
      row.appendChild(label);

      var grid = document.createElement("div");
      grid.className = "scale-grid";
      for (var i = q.min; i <= q.max; i++) {
        (function (val) {
          var btn = document.createElement("button");
          btn.className = "btn btn-scale";
          btn.textContent = val;
          if (diaryAnswers[q.key] === val) {
            btn.classList.add("selected");
          }
          btn.addEventListener("click", function () {
            diaryAnswers[q.key] = val;
            grid.querySelectorAll(".btn-scale").forEach(function (b) {
              b.classList.remove("selected");
            });
            btn.classList.add("selected");
          });
          grid.appendChild(btn);
        })(i);
      }
      row.appendChild(grid);
      list.appendChild(row);
    });

    showState(stateDiaryBulkScales);
  }

  document.getElementById("btn-bulk-scales-back").addEventListener("click", function () {
    showState(stateDiarySummary);
  });

  document.getElementById("btn-bulk-scales-next").addEventListener("click", function () {
    renderBulkText();
  });

  // --- Bulk text ---

  function renderBulkText() {
    var questionList = document.getElementById("bulk-text-questions");
    questionList.innerHTML = "";
    TEXT_QUESTIONS.forEach(function (q) {
      var li = document.createElement("li");
      li.textContent = q.label + " — " + q.question;
      questionList.appendChild(li);
    });

    // Pre-fill textarea from existing text answers
    var textarea = document.getElementById("bulk-text-input");
    var existing = TEXT_QUESTIONS
      .filter(function (q) { return diaryAnswers[q.key]; })
      .map(function (q) { return q.label + ": " + diaryAnswers[q.key]; })
      .join("\n");
    textarea.value = existing;

    showState(stateDiaryBulkText);
    setTimeout(function () { textarea.focus(); }, 50);
  }

  document.getElementById("btn-bulk-text-back").addEventListener("click", function () {
    renderBulkScales();
  });

  document.getElementById("btn-bulk-text-review").addEventListener("click", async function () {
    var rawText = document.getElementById("bulk-text-input").value.trim();

    if (!rawText) {
      // No text — go straight to review with just scale answers
      renderDiaryReview();
      return;
    }

    showState(stateDiaryBulkParsing);

    var token = getToken();
    var questions = TEXT_QUESTIONS.map(function (q) {
      return { key: q.key, label: q.label };
    });

    try {
      var res = await fetch(API_BASE + "/diary/parse-text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({ raw_text: rawText, questions: questions }),
      });

      if (!res.ok) {
        var body = await res.json().catch(function () { return {}; });
        throw new Error(body.detail || "HTTP " + res.status);
      }

      var data = await res.json();
      // Merge parsed text answers with existing scale answers
      Object.keys(data.answers).forEach(function (k) {
        if (data.answers[k]) {
          diaryAnswers[k] = data.answers[k];
        }
      });

      renderDiaryReview();
    } catch (err) {
      if (err instanceof TypeError) {
        var scaleAnswers = {};
        SCALE_QUESTIONS.forEach(function (q) {
          if (diaryAnswers[q.key] !== undefined) scaleAnswers[q.key] = diaryAnswers[q.key];
        });
        addToQueue("diary_bulk", {
          date: diaryDate,
          scale_answers: scaleAnswers,
          raw_text: rawText,
          questions: questions,
        });
        showToast("Diary queued offline", "success");
        resetToIdle();
        return;
      }
      showToast(err.message || "Network error", "error");
      showState(stateDiaryBulkText);
    }
  });

  // Render current diary step
  function renderDiaryStep() {
    var q = DIARY_QUESTIONS[diaryStepIndex];
    document.getElementById("diary-progress").textContent = (diaryStepIndex + 1) + " / " + DIARY_QUESTIONS.length;
    document.getElementById("diary-step-label").textContent = q.label;
    document.getElementById("diary-step-question").textContent = q.question;

    var area = document.getElementById("diary-step-input-area");
    area.innerHTML = "";

    if (q.type === "scale") {
      var grid = document.createElement("div");
      grid.className = "scale-grid";
      for (var i = q.min; i <= q.max; i++) {
        (function (val) {
          var btn = document.createElement("button");
          btn.className = "btn btn-scale";
          btn.textContent = val;
          if (diaryAnswers[q.key] === val) {
            btn.classList.add("selected");
          }
          btn.addEventListener("click", function () {
            diaryAnswers[q.key] = val;
            grid.querySelectorAll(".btn-scale").forEach(function (b) {
              b.classList.remove("selected");
            });
            btn.classList.add("selected");
            // Auto-advance after selecting a scale value
            setTimeout(function () {
              if (diaryStepIndex < DIARY_QUESTIONS.length - 1) {
                diaryStepIndex++;
                renderDiaryStep();
              } else {
                renderDiaryReview();
              }
            }, 200);
          });
          grid.appendChild(btn);
        })(i);
      }
      area.appendChild(grid);
      // Keyboard shortcuts: 1-9 for 1-9, 0 for 10
      if (activeScaleKeyHandler) {
        document.removeEventListener("keydown", activeScaleKeyHandler);
      }
      var scaleKeyHandler = function (e) {
        if (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT") return;
        var val = null;
        if (e.key >= "1" && e.key <= "9") val = parseInt(e.key);
        if (e.key === "0") val = 10;
        if (val !== null && val >= q.min && val <= q.max) {
          diaryAnswers[q.key] = val;
          grid.querySelectorAll(".btn-scale").forEach(function (b) {
            b.classList.remove("selected");
          });
          grid.querySelector(".btn-scale:nth-child(" + val + ")").classList.add("selected");
          document.removeEventListener("keydown", scaleKeyHandler);
          setTimeout(function () {
            if (diaryStepIndex < DIARY_QUESTIONS.length - 1) {
              diaryStepIndex++;
              renderDiaryStep();
            } else {
              renderDiaryReview();
            }
          }, 200);
        }
      };
      activeScaleKeyHandler = scaleKeyHandler;
      document.addEventListener("keydown", scaleKeyHandler);
    } else {
      if (activeScaleKeyHandler) {
        document.removeEventListener("keydown", activeScaleKeyHandler);
        activeScaleKeyHandler = null;
      }
      var textarea = document.createElement("textarea");
      textarea.className = "diary-textarea";
      textarea.placeholder = "Type your answer...";
      textarea.rows = 3;
      textarea.value = diaryAnswers[q.key] || "";
      textarea.addEventListener("input", function () {
        diaryAnswers[q.key] = textarea.value;
      });
      textarea.addEventListener("keydown", function (e) {
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
          diaryAnswers[q.key] = textarea.value;
          if (diaryStepIndex < DIARY_QUESTIONS.length - 1) {
            diaryStepIndex++;
            renderDiaryStep();
          } else {
            renderDiaryReview();
          }
        }
      });
      area.appendChild(textarea);
      setTimeout(function () { textarea.focus(); }, 50);
    }

    // Update button labels
    var nextBtn = document.getElementById("btn-diary-next");
    nextBtn.textContent = diaryStepIndex === DIARY_QUESTIONS.length - 1 ? "Review" : "Next";

    var prevBtn = document.getElementById("btn-diary-prev");
    prevBtn.textContent = diaryStepIndex === 0 ? "Back" : "Prev";

    showState(stateDiaryStep);
  }

  // Diary: next step
  document.getElementById("btn-diary-next").addEventListener("click", function () {
    if (diaryStepIndex < DIARY_QUESTIONS.length - 1) {
      diaryStepIndex++;
      renderDiaryStep();
    } else {
      renderDiaryReview();
    }
  });

  // Diary: prev step
  document.getElementById("btn-diary-prev").addEventListener("click", function () {
    if (diaryStepIndex > 0) {
      diaryStepIndex--;
      renderDiaryStep();
    } else {
      showState(stateDiarySummary);
    }
  });

  // Render review screen
  function renderDiaryReview() {
    var list = document.getElementById("diary-review-list");
    list.innerHTML = "";

    SCALE_QUESTIONS.concat(TEXT_QUESTIONS).forEach(function (q) {
      var item = document.createElement("div");
      item.className = "diary-review-item";

      var label = document.createElement("div");
      label.className = "review-label";
      label.textContent = q.label;

      var value = document.createElement("div");
      value.className = "review-value";
      var ans = diaryAnswers[q.key];
      value.textContent = ans !== undefined && ans !== "" ? ans : "—";

      item.appendChild(label);
      item.appendChild(value);
      list.appendChild(item);
    });

    showState(stateDiaryReview);
  }

  // Diary: back to edit from review
  document.getElementById("btn-diary-back-review").addEventListener("click", function () {
    diaryStepIndex = DIARY_QUESTIONS.length - 1;
    renderDiaryStep();
  });

  // Diary: save
  document.getElementById("btn-diary-save").addEventListener("click", async function () {
    showState(stateDiarySaving);

    var token = getToken();
    try {
      var res = await fetch(API_BASE + "/diary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({ date: diaryDate, answers: diaryAnswers }),
      });

      if (!res.ok) {
        var body = await res.json().catch(function () { return {}; });
        throw new Error(body.detail || "HTTP " + res.status);
      }

      showToast("Diary saved", "success");
      resetToIdle();
    } catch (err) {
      if (err instanceof TypeError) {
        addToQueue("diary", { date: diaryDate, answers: diaryAnswers });
        showToast("Diary saved offline", "success");
        resetToIdle();
        return;
      }
      showToast(err.message || "Network error", "error");
      showState(stateDiaryReview);
    }
  });

  // --- History ---

  var historyTab = "events";
  var historyDateInput = document.getElementById("history-date");
  var historyRangeCheck = document.getElementById("history-range-check");
  var historyRangeRow = document.getElementById("history-range-row");
  var historyDateFrom = document.getElementById("history-date-from");
  var historyDateTo = document.getElementById("history-date-to");
  var historyResults = document.getElementById("history-results");

  document.getElementById("btn-history").addEventListener("click", function () {
    if (!getToken()) {
      promptForToken();
      return;
    }
    historyTab = "events";
    historyDateInput.value = todayStr();
    historyRangeCheck.checked = false;
    historyRangeRow.classList.add("hidden");
    document.getElementById("tab-events").classList.add("active");
    document.getElementById("tab-diary").classList.remove("active");
    showState(stateHistory);
    fetchHistory();
  });

  document.getElementById("btn-history-back").addEventListener("click", resetToIdle);

  document.getElementById("tab-events").addEventListener("click", function () {
    historyTab = "events";
    document.getElementById("tab-events").classList.add("active");
    document.getElementById("tab-diary").classList.remove("active");
    fetchHistory();
  });

  document.getElementById("tab-diary").addEventListener("click", function () {
    historyTab = "diary";
    document.getElementById("tab-diary").classList.add("active");
    document.getElementById("tab-events").classList.remove("active");
    fetchHistory();
  });

  historyDateInput.addEventListener("change", fetchHistory);
  historyDateFrom.addEventListener("change", fetchHistory);
  historyDateTo.addEventListener("change", fetchHistory);

  historyRangeCheck.addEventListener("change", function () {
    if (historyRangeCheck.checked) {
      historyRangeRow.classList.remove("hidden");
      historyDateInput.parentElement.classList.add("hidden");
      historyDateFrom.value = historyDateInput.value;
      historyDateTo.value = historyDateInput.value;
    } else {
      historyRangeRow.classList.add("hidden");
      historyDateInput.parentElement.classList.remove("hidden");
      historyDateInput.value = historyDateFrom.value || todayStr();
    }
    fetchHistory();
  });

  async function fetchHistory() {
    var token = getToken();
    var headers = { Authorization: "Bearer " + token };

    historyResults.innerHTML = '<p class="history-empty">Loading...</p>';

    try {
      if (historyTab === "events") {
        var url;
        if (historyRangeCheck.checked) {
          url = API_BASE + "/events?from=" + historyDateFrom.value + "&to=" + historyDateTo.value;
        } else {
          url = API_BASE + "/events?date=" + historyDateInput.value;
        }
        var res = await fetch(url, { headers: headers });
        if (!res.ok) throw new Error("HTTP " + res.status);
        var events = await res.json();
        renderEvents(events);
      } else {
        var dateVal = historyRangeCheck.checked ? historyDateFrom.value : historyDateInput.value;
        var res = await fetch(API_BASE + "/diary/" + dateVal, { headers: headers });
        if (res.status === 404) {
          historyResults.innerHTML = '<p class="history-empty">No diary entry for this date.</p>';
          return;
        }
        if (!res.ok) throw new Error("HTTP " + res.status);
        var diary = await res.json();
        renderDiaryHistory(diary);
      }
    } catch (err) {
      historyResults.innerHTML = '<p class="history-empty">Error: ' + (err.message || "Network error") + '</p>';
    }
  }

  function editEvent(ev) {
    editingEventId = ev.id;
    selectedType = ev.type;
    document.getElementById("compose-label").textContent = "Edit " + ev.type;
    composeType.textContent = ev.type;

    // Parse timestamp to local datetime-local format
    var d = new Date(ev.client_timestamp);
    var y = d.getFullYear();
    var mo = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    var hh = String(d.getHours()).padStart(2, "0");
    var mm = String(d.getMinutes()).padStart(2, "0");
    inputDatetime.value = y + "-" + mo + "-" + day + "T" + hh + ":" + mm;

    inputText.value = ev.text;
    showState(stateCompose);
    inputText.focus();
  }

  function renderEvents(events) {
    historyResults.innerHTML = "";
    if (!events.length) {
      historyResults.innerHTML = '<p class="history-empty">No events found.</p>';
      return;
    }
    events.forEach(function (ev) {
      var card = document.createElement("div");
      card.className = "event-card";

      var header = document.createElement("div");
      header.className = "event-card-header";

      var badge = document.createElement("span");
      badge.className = "event-type-badge";
      badge.textContent = ev.type;

      var time = document.createElement("span");
      time.className = "event-time";
      var ts = ev.client_timestamp || "";
      time.textContent = ts.slice(11, 16);

      header.appendChild(badge);
      header.appendChild(time);

      var text = document.createElement("div");
      text.className = "event-text";
      text.textContent = ev.text;

      var editBtn = document.createElement("button");
      editBtn.className = "btn btn-edit";
      editBtn.textContent = "Edit";
      editBtn.addEventListener("click", function () {
        editEvent(ev);
      });

      card.appendChild(header);
      card.appendChild(text);
      card.appendChild(editBtn);
      historyResults.appendChild(card);
    });
  }

  function renderDiaryHistory(diary) {
    historyResults.innerHTML = "";
    if (!diary.answers || !Object.keys(diary.answers).length) {
      historyResults.innerHTML = '<p class="history-empty">Diary entry is empty.</p>';
      return;
    }

    SCALE_QUESTIONS.concat(TEXT_QUESTIONS).forEach(function (q) {
      var ans = diary.answers[q.key];
      if (ans === undefined || ans === "") return;

      var item = document.createElement("div");
      item.className = "diary-review-item";

      var label = document.createElement("div");
      label.className = "review-label";
      label.textContent = q.label;

      var value = document.createElement("div");
      value.className = "review-value";
      value.textContent = ans;

      item.appendChild(label);
      item.appendChild(value);
      historyResults.appendChild(item);
    });

    var editBtn = document.createElement("button");
    editBtn.className = "btn btn-edit";
    editBtn.textContent = "Edit Diary";
    editBtn.addEventListener("click", function () {
      var dateVal = historyRangeCheck.checked ? historyDateFrom.value : historyDateInput.value;
      diaryDate = dateVal;
      diaryAnswers = diary.answers || {};
      diaryBulkMode = false;
      diaryStepIndex = 0;
      renderDiaryStep();
    });
    historyResults.appendChild(editBtn);
  }

  // --- Token button ---

  document.getElementById("btn-token").addEventListener("click", promptForToken);

  // --- Hard refresh ---

  document.getElementById("btn-refresh").addEventListener("click", function () {
    // Clear caches in the background, navigate immediately
    try {
      if (navigator.serviceWorker) {
        navigator.serviceWorker.getRegistration().then(function (reg) {
          if (reg) reg.unregister();
        });
      }
      caches.keys().then(function (names) {
        names.forEach(function (n) { caches.delete(n); });
      });
    } catch (e) { /* ignore */ }
    window.location.href = window.location.pathname + "?_=" + Date.now();
  });

  // --- Offline queue UI ---

  document.getElementById("btn-queue").addEventListener("click", renderQueueScreen);

  document.getElementById("btn-queue-back").addEventListener("click", resetToIdle);

  document.getElementById("btn-queue-sync").addEventListener("click", async function () {
    await processQueue();
    renderQueueScreen();
  });

  // --- Startup & online sync ---

  document.getElementById("app-version").textContent = "v" + APP_VERSION;
  updateQueueBadge();
  processQueue();

  window.addEventListener("online", function () {
    showToast("Back online — syncing...", "success");
    processQueue().then(updateQueueBadge);
  });

  // --- Service worker registration ---

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js");
  }
})();
