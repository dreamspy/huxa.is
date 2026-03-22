import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";

const API_BASE = "https://mnemo.axex.is";
const APP_VERSION = "1.0.0";

const C = {
  bg: "#1a1a2e",
  surface: "#16213e",
  input: "#0f3460",
  text: "#e0e0e0",
  muted: "#8a8a9a",
  accent: "#e94560",
  success: "#4ecdc4",
  error: "#ff6b6b",
  radius: 10,
};

const DIARY_QUESTIONS = [
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
const SCALE_QUESTIONS = DIARY_QUESTIONS.filter(function (q) { return q.type === "scale"; });
const TEXT_QUESTIONS = DIARY_QUESTIONS.filter(function (q) { return q.type === "text"; });
const CATEGORIES = ["Event", "Intervention", "Symptom", "Decision", "Thought"];

function generateUUID() {
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, function (c) {
    var r = (Math.random() * 16) | 0;
    return (c ^ (r & (15 >> (c / 4)))).toString(16);
  });
}

function todayStr() { return new Date().toISOString().slice(0, 10); }
function yesterdayStr() { var d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); }
function formatTime(s) { return s ? s.slice(11, 16) : ""; }

export default function App() {
  var _a = useState("idle"), screen = _a[0], setScreen = _a[1];
  var _b = useState(""), token = _b[0], setToken = _b[1];
  var _c = useState(""), tokenInput = _c[0], setTokenInput = _c[1];
  var _d = useState(null), toast = _d[0], setToast = _d[1];

  var _e = useState(null), selectedType = _e[0], setSelectedType = _e[1];
  var _f = useState(""), composeText = _f[0], setComposeText = _f[1];
  var _g = useState(new Date()), composeDate = _g[0], setComposeDate = _g[1];
  var _h = useState(false), showDatePicker = _h[0], setShowDatePicker = _h[1];
  var _i = useState(null), editingEventId = _i[0], setEditingEventId = _i[1];

  var _j = useState(todayStr()), historyDate = _j[0], setHistoryDate = _j[1];
  var _k = useState("events"), historyTab = _k[0], setHistoryTab = _k[1];
  var _l = useState([]), historyEvents = _l[0], setHistoryEvents = _l[1];
  var _m = useState(null), historyDiary = _m[0], setHistoryDiary = _m[1];
  var _n = useState(false), historyLoading = _n[0], setHistoryLoading = _n[1];
  var _o = useState(false), showHistoryDatePicker = _o[0], setShowHistoryDatePicker = _o[1];

  var _p = useState(todayStr()), diaryDate = _p[0], setDiaryDate = _p[1];
  var _q = useState({}), diaryAnswers = _q[0], setDiaryAnswers = _q[1];
  var _r = useState(0), diaryStep = _r[0], setDiaryStep = _r[1];
  var _s = useState(""), diarySummary = _s[0], setDiarySummary = _s[1];
  var _t = useState(false), diaryHasExisting = _t[0], setDiaryHasExisting = _t[1];
  var _v = useState(""), bulkText = _v[0], setBulkText = _v[1];

  var _u = useState([]), queue = _u[0], setQueue = _u[1];

  useEffect(function () {
    AsyncStorage.getItem("mnemo_token").then(function (t) { if (t) setToken(t); });
    loadQueue();
  }, []);

  function showToastMsg(msg, type) {
    setToast({ msg: msg, type: type });
    setTimeout(function () { setToast(null); }, 3000);
  }

  function saveTokenFn() {
    var t = tokenInput.trim();
    if (t) {
      AsyncStorage.setItem("mnemo_token", t);
      setToken(t);
      showToastMsg("Token saved", "success");
      setScreen("idle");
    }
  }

  function authHeaders() {
    return { "Content-Type": "application/json", Authorization: "Bearer " + token };
  }

  function loadQueue() {
    AsyncStorage.getItem("mnemo_queue").then(function (val) {
      try { setQueue(JSON.parse(val || "[]")); } catch (e) { setQueue([]); }
    });
  }

  function saveQueueItems(items) {
    AsyncStorage.setItem("mnemo_queue", JSON.stringify(items));
    setQueue(items);
  }

  function addToQueueFn(kind, payload) {
    var items = queue.concat([{ id: generateUUID(), created_at: new Date().toISOString(), kind: kind, status: "pending", payload: payload }]);
    saveQueueItems(items);
  }

  function processQueueFn() {
    var items = queue.slice();
    var changed = false;
    var process = function (i) {
      if (i >= items.length) { if (changed) saveQueueItems(items); return; }
      var item = items[i];
      if (item.status !== "pending" && item.status !== "failed") { process(i + 1); return; }
      var endpoint = item.kind === "diary" ? "/diary" : "/events";
      fetch(API_BASE + endpoint, { method: "POST", headers: authHeaders(), body: JSON.stringify(item.payload) })
        .then(function (res) {
          if (!res.ok) throw new Error("HTTP " + res.status);
          items.splice(i, 1); changed = true; process(i);
        })
        .catch(function (err) {
          if (err instanceof TypeError) { if (changed) saveQueueItems(items); return; }
          item.status = "failed"; item.error = err.message; changed = true; process(i + 1);
        });
    };
    process(0);
  }

  function submitEvent(nextType) {
    var text = composeText.trim();
    if (!text) { showToastMsg("Text is required", "error"); return; }
    if (!token) { setScreen("token"); return; }

    var isEditing = !!editingEventId;
    var eventId = isEditing ? editingEventId : generateUUID();
    var clientTs = composeDate.toISOString().replace(/\.\d{3}Z$/, "Z");
    var event = { id: eventId, client_timestamp: clientTs, type: selectedType, text: text, metrics: {}, meta: { version: 1 } };

    setScreen("submitting");
    var url = isEditing ? API_BASE + "/events/" + eventId : API_BASE + "/events";
    fetch(url, { method: isEditing ? "PUT" : "POST", headers: authHeaders(), body: JSON.stringify(event) })
      .then(function (res) {
        if (!res.ok) return res.json().catch(function () { return {}; }).then(function (body) { throw new Error(body.detail || "HTTP " + res.status); });
        setEditingEventId(null);
        if (nextType) {
          showToastMsg("Logged", "success");
          setSelectedType(nextType); setComposeText(""); setComposeDate(new Date()); setScreen("compose");
        } else {
          showToastMsg(isEditing ? "Updated" : "Logged", "success"); setScreen("idle");
        }
      })
      .catch(function (err) {
        if (err instanceof TypeError) { addToQueueFn("event", event); showToastMsg("Saved offline", "success"); setEditingEventId(null); setScreen("idle"); return; }
        showToastMsg(err.message || "Network error", "error"); setScreen("compose");
      });
  }

  function doFetchHistory(tab, date) {
    setHistoryLoading(true);
    if (tab === "events") {
      fetch(API_BASE + "/events?date=" + date, { headers: authHeaders() })
        .then(function (res) { if (!res.ok) throw new Error("HTTP " + res.status); return res.json(); })
        .then(function (data) { setHistoryEvents(data); setHistoryDiary(null); setHistoryLoading(false); })
        .catch(function (err) { showToastMsg(err.message, "error"); setHistoryLoading(false); });
    } else {
      fetch(API_BASE + "/diary/" + date, { headers: authHeaders() })
        .then(function (res) { if (res.status === 404) { setHistoryDiary(null); return null; } if (!res.ok) throw new Error("HTTP " + res.status); return res.json(); })
        .then(function (data) { setHistoryDiary(data); setHistoryEvents([]); setHistoryLoading(false); })
        .catch(function (err) { showToastMsg(err.message, "error"); setHistoryLoading(false); });
    }
  }

  function openHistory() {
    if (!token) { setScreen("token"); return; }
    var d = todayStr(); setHistoryDate(d); setHistoryTab("events"); setScreen("history"); doFetchHistory("events", d);
  }

  function editEvent(ev) {
    setEditingEventId(ev.id); setSelectedType(ev.type); setComposeText(ev.text); setComposeDate(new Date(ev.client_timestamp)); setScreen("compose");
  }

  function startDiary(date) {
    setDiaryDate(date); setDiaryAnswers({}); setDiaryStep(0); setScreen("diary-loading");
    Promise.all([
      fetch(API_BASE + "/diary/" + date, { headers: authHeaders() }),
      fetch(API_BASE + "/diary/" + date + "/summary", { headers: authHeaders() }),
    ]).then(function (results) {
      var entryRes = results[0], summaryRes = results[1];
      var hasExisting = false;
      var handleEntry = entryRes.ok ? entryRes.json() : Promise.resolve(null);
      var handleSummary = summaryRes.ok ? summaryRes.json() : Promise.resolve(null);
      return Promise.all([handleEntry, handleSummary]);
    }).then(function (data) {
      var entryData = data[0], summaryData = data[1];
      if (entryData && entryData.answers) {
        setDiaryAnswers(entryData.answers);
        setDiaryHasExisting(Object.keys(entryData.answers).length > 0);
      } else {
        setDiaryHasExisting(false);
      }
      setDiarySummary(summaryData ? summaryData.summary : "No events logged for this date.");
      setScreen("diary-summary");
    }).catch(function (err) {
      if (err instanceof TypeError) { setDiarySummary("Offline"); setDiaryHasExisting(false); setScreen("diary-summary"); return; }
      showToastMsg(err.message, "error"); setScreen("diary-date");
    });
  }

  function setDiaryAnswer(key, value) {
    var updated = Object.assign({}, diaryAnswers);
    updated[key] = value;
    setDiaryAnswers(updated);
  }

  function saveDiary() {
    setScreen("submitting");
    fetch(API_BASE + "/diary", { method: "POST", headers: authHeaders(), body: JSON.stringify({ date: diaryDate, answers: diaryAnswers }) })
      .then(function (res) { if (!res.ok) return res.json().catch(function () { return {}; }).then(function (b) { throw new Error(b.detail || "HTTP " + res.status); }); showToastMsg("Diary saved", "success"); setScreen("idle"); })
      .catch(function (err) {
        if (err instanceof TypeError) { addToQueueFn("diary", { date: diaryDate, answers: diaryAnswers }); showToastMsg("Diary saved offline", "success"); setScreen("idle"); return; }
        showToastMsg(err.message, "error"); setScreen("diary-review");
      });
  }

  function renderScaleGrid(questionKey, min, max) {
    var current = diaryAnswers[questionKey];
    var buttons = [];
    for (var i = min; i <= max; i++) {
      (function (val) {
        buttons.push(
          <TouchableOpacity key={val} style={[st.scaleBtn, current === val && st.scaleBtnSelected]} onPress={function () { setDiaryAnswer(questionKey, val); }}>
            <Text style={[st.scaleBtnText, current === val && st.scaleBtnTextSelected]}>{val}</Text>
          </TouchableOpacity>
        );
      })(i);
    }
    return <View style={st.scaleGrid}>{buttons}</View>;
  }

  function renderToast() {
    if (!toast) return null;
    return <View style={[st.toast, toast.type === "success" ? st.toastSuccess : st.toastError]}><Text style={st.toastText}>{toast.msg}</Text></View>;
  }

  // --- IDLE ---
  if (screen === "idle") {
    return (
      <SafeAreaView style={st.container}>
        <StatusBar barStyle="light-content" />
        <TouchableOpacity onPress={function () { setScreen("idle"); }}><Text style={st.title}>Mnemo</Text></TouchableOpacity>
        <View style={st.idleButtons}>
          <TouchableOpacity style={st.btn} onPress={function () { if (!token) setScreen("token"); else setScreen("category"); }}><Text style={st.btnText}>Log</Text></TouchableOpacity>
          <TouchableOpacity style={[st.btn, st.btnSecondary]} onPress={function () { if (!token) setScreen("token"); else { setDiaryDate(todayStr()); setScreen("diary-date"); } }}><Text style={st.btnText}>Diary</Text></TouchableOpacity>
          <TouchableOpacity style={[st.btn, st.btnSecondary]} onPress={openHistory}><Text style={st.btnText}>History</Text></TouchableOpacity>
          {queue.length > 0 && <TouchableOpacity style={[st.btn, { backgroundColor: C.input }]} onPress={function () { processQueueFn(); showToastMsg("Syncing...", "success"); }}><Text style={st.btnText}>{queue.length} pending</Text></TouchableOpacity>}
        </View>
        <TouchableOpacity style={st.settingsBtn} onPress={function () { setTokenInput(token); setScreen("token"); }}><Text style={st.settingsBtnText}>Settings</Text></TouchableOpacity>
        <Text style={st.version}>v{APP_VERSION}</Text>
        {renderToast()}
      </SafeAreaView>
    );
  }

  // --- TOKEN ---
  if (screen === "token") {
    return (
      <SafeAreaView style={st.container}>
        <TouchableOpacity onPress={function () { setScreen("idle"); }}><Text style={st.title}>Mnemo</Text></TouchableOpacity>
        <Text style={st.label}>Set API Token</Text>
        <TextInput style={st.input} placeholder="Bearer token" placeholderTextColor={C.muted} value={tokenInput} onChangeText={setTokenInput} autoCapitalize="none" autoCorrect={false} />
        <View style={st.row}>
          <TouchableOpacity style={st.btnBack} onPress={function () { setScreen("idle"); }}><Text style={st.btnBackText}>Back</Text></TouchableOpacity>
          <TouchableOpacity style={st.btnSubmit} onPress={saveTokenFn}><Text style={st.btnSubmitText}>Save</Text></TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // --- CATEGORY ---
  if (screen === "category") {
    return (
      <SafeAreaView style={st.container}>
        <TouchableOpacity onPress={function () { setScreen("idle"); }}><Text style={st.title}>Mnemo</Text></TouchableOpacity>
        <Text style={st.label}>Category</Text>
        <View style={st.categoryGrid}>
          {CATEGORIES.map(function (cat) {
            return <TouchableOpacity key={cat} style={st.categoryBtn} onPress={function () { setEditingEventId(null); setSelectedType(cat); setComposeText(""); setComposeDate(new Date()); setScreen("compose"); }}><Text style={st.categoryBtnText}>{cat}</Text></TouchableOpacity>;
          })}
        </View>
        <View style={{ height: 12 }} />
        <View style={st.halfRow}><TouchableOpacity style={st.btnBack} onPress={function () { setScreen("idle"); }}><Text style={st.btnBackText}>Back</Text></TouchableOpacity></View>
      </SafeAreaView>
    );
  }

  // --- COMPOSE ---
  if (screen === "compose") {
    return (
      <SafeAreaView style={st.container}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, width: "100%" }}>
          <ScrollView contentContainerStyle={st.scrollContent} keyboardShouldPersistTaps="handled">
            <TouchableOpacity onPress={function () { setScreen("idle"); }}><Text style={st.title}>Mnemo</Text></TouchableOpacity>
            <Text style={st.label}>{editingEventId ? "Edit " : "New "}{selectedType}</Text>
            <View style={st.datePickerRow}>
              <DateTimePicker value={composeDate} mode="date" display="default" themeVariant="dark" onChange={function (e, date) { if (date) setComposeDate(date); }} />
              <DateTimePicker value={composeDate} mode="time" display="default" themeVariant="dark" onChange={function (e, date) { if (date) setComposeDate(date); }} />
            </View>
            <TextInput style={[st.input, st.textArea]} placeholder="What happened?" placeholderTextColor={C.muted} value={composeText} onChangeText={setComposeText} multiline numberOfLines={3} />
            <View style={st.row}>
              <TouchableOpacity style={st.btnBack} onPress={function () { if (editingEventId) { setEditingEventId(null); setScreen("history"); doFetchHistory(historyTab, historyDate); } else setScreen("category"); }}><Text style={st.btnBackText}>Back</Text></TouchableOpacity>
              <TouchableOpacity style={st.btnSubmit} onPress={function () { submitEvent(null); }}><Text style={st.btnSubmitText}>Submit</Text></TouchableOpacity>
            </View>
            {!editingEventId && (
              <View style={st.submitNewSection}>
                <Text style={st.labelSmall}>Submit & log another</Text>
                <View style={st.categoryGrid}>
                  {CATEGORIES.map(function (cat) { return <TouchableOpacity key={cat} style={st.categoryBtn} onPress={function () { submitEvent(cat); }}><Text style={st.categoryBtnText}>{cat}</Text></TouchableOpacity>; })}
                </View>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
        {renderToast()}
      </SafeAreaView>
    );
  }

  // --- SUBMITTING ---
  if (screen === "submitting") {
    return <SafeAreaView style={st.container}><Text style={st.label}>Submitting...</Text></SafeAreaView>;
  }

  // --- HISTORY ---
  if (screen === "history") {
    return (
      <SafeAreaView style={st.container}>
        <TouchableOpacity onPress={function () { setScreen("idle"); }}><Text style={st.title}>Mnemo</Text></TouchableOpacity>
        <Text style={st.label}>History</Text>
        <TouchableOpacity style={st.input} onPress={function () { setShowHistoryDatePicker(true); }}><Text style={st.inputText}>{historyDate}</Text></TouchableOpacity>
        {showHistoryDatePicker && <DateTimePicker value={new Date(historyDate + "T12:00:00")} mode="date" display="default" onChange={function (e, date) { setShowHistoryDatePicker(Platform.OS === "ios"); if (date) { var d = date.toISOString().slice(0, 10); setHistoryDate(d); doFetchHistory(historyTab, d); } }} />}
        <View style={st.historyTabs}>
          <TouchableOpacity style={[st.historyTab, historyTab === "events" && st.historyTabActive]} onPress={function () { setHistoryTab("events"); doFetchHistory("events", historyDate); }}><Text style={[st.historyTabText, historyTab === "events" && st.historyTabTextActive]}>Events</Text></TouchableOpacity>
          <TouchableOpacity style={[st.historyTab, historyTab === "diary" && st.historyTabActive]} onPress={function () { setHistoryTab("diary"); doFetchHistory("diary", historyDate); }}><Text style={[st.historyTabText, historyTab === "diary" && st.historyTabTextActive]}>Diary</Text></TouchableOpacity>
        </View>
        <ScrollView style={st.historyScroll} contentContainerStyle={st.historyScrollContent}>
          {historyLoading ? <Text style={st.emptyText}>Loading...</Text> : historyTab === "events" ? (
            historyEvents.length === 0 ? <Text style={st.emptyText}>No events found.</Text> :
            historyEvents.map(function (ev) {
              return (
                <View key={ev.id} style={st.eventCard}>
                  <View style={st.eventHeader}>
                    <View style={st.badge}><Text style={st.badgeText}>{ev.type}</Text></View>
                    <Text style={st.eventTime}>{formatTime(ev.client_timestamp)}</Text>
                  </View>
                  <Text style={st.eventText}>{ev.text}</Text>
                  <TouchableOpacity style={st.editBtn} onPress={function () { editEvent(ev); }}><Text style={st.editBtnText}>Edit</Text></TouchableOpacity>
                </View>
              );
            })
          ) : historyDiary === null ? <Text style={st.emptyText}>No diary entry for this date.</Text> : (
            <View>
              {SCALE_QUESTIONS.concat(TEXT_QUESTIONS).map(function (q) {
                var ans = historyDiary.answers ? historyDiary.answers[q.key] : undefined;
                if (ans === undefined || ans === "") return null;
                return <View key={q.key} style={st.reviewItem}><Text style={st.reviewLabel}>{q.label}</Text><Text style={st.reviewValue}>{ans}</Text></View>;
              })}
              <TouchableOpacity style={st.editBtn} onPress={function () { setDiaryDate(historyDate); setDiaryAnswers(historyDiary.answers || {}); setDiaryStep(0); setScreen("diary-step"); }}><Text style={st.editBtnText}>Edit Diary</Text></TouchableOpacity>
            </View>
          )}
        </ScrollView>
        <View style={st.halfRow}><TouchableOpacity style={st.btnBack} onPress={function () { setScreen("idle"); }}><Text style={st.btnBackText}>Back</Text></TouchableOpacity></View>
        {renderToast()}
      </SafeAreaView>
    );
  }

  // --- DIARY DATE ---
  if (screen === "diary-date") {
    return (
      <SafeAreaView style={st.container}>
        <TouchableOpacity onPress={function () { setScreen("idle"); }}><Text style={st.title}>Mnemo</Text></TouchableOpacity>
        <Text style={st.label}>Diary - Pick a Date</Text>
        <View style={st.row}>
          <TouchableOpacity style={st.btnBack} onPress={function () { startDiary(yesterdayStr()); }}><Text style={st.btnBackText}>Yesterday</Text></TouchableOpacity>
          <TouchableOpacity style={st.btnSubmit} onPress={function () { startDiary(todayStr()); }}><Text style={st.btnSubmitText}>Today</Text></TouchableOpacity>
        </View>
        <View style={{ height: 12 }} />
        <View style={st.halfRow}><TouchableOpacity style={st.btnBack} onPress={function () { setScreen("idle"); }}><Text style={st.btnBackText}>Back</Text></TouchableOpacity></View>
      </SafeAreaView>
    );
  }

  // --- DIARY LOADING ---
  if (screen === "diary-loading") {
    return <SafeAreaView style={st.container}><Text style={st.label}>Loading...</Text></SafeAreaView>;
  }

  // --- DIARY SUMMARY ---
  if (screen === "diary-summary") {
    return (
      <SafeAreaView style={st.container}>
        <ScrollView contentContainerStyle={st.scrollContent}>
          <TouchableOpacity onPress={function () { setScreen("idle"); }}><Text style={st.title}>Mnemo</Text></TouchableOpacity>
          <Text style={st.label}>{diaryHasExisting ? "Existing Entry" : "Today's Events Summary"}</Text>
          <View style={st.summaryBox}><Text style={st.summaryText}>{diarySummary}</Text></View>
          {diaryHasExisting ? (
            <View style={st.row}>
              <TouchableOpacity style={st.btnBack} onPress={function () { setScreen("idle"); }}><Text style={st.btnBackText}>Looks Good</Text></TouchableOpacity>
              <TouchableOpacity style={st.btnSubmit} onPress={function () { setScreen("diary-bulk-scales"); }}><Text style={st.btnSubmitText}>Edit</Text></TouchableOpacity>
            </View>
          ) : (
            <View style={st.row}>
              <TouchableOpacity style={st.btnBack} onPress={function () { setScreen("diary-bulk-scales"); }}><Text style={st.btnBackText}>Quick Entry</Text></TouchableOpacity>
              <TouchableOpacity style={st.btnSubmit} onPress={function () { setDiaryStep(0); setScreen("diary-step"); }}><Text style={st.btnSubmitText}>Continue</Text></TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // --- DIARY BULK SCALES ---
  if (screen === "diary-bulk-scales") {
    return (
      <SafeAreaView style={st.container}>
        <ScrollView contentContainerStyle={st.scrollContent} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={function () { setScreen("idle"); }}><Text style={st.title}>Mnemo</Text></TouchableOpacity>
          <Text style={st.label}>Rate Your Day</Text>
          {SCALE_QUESTIONS.map(function (q) {
            var current = diaryAnswers[q.key];
            return (
              <View key={q.key} style={{ width: "100%", marginBottom: 16 }}>
                <Text style={st.labelSmall}>{q.label}</Text>
                <View style={st.scaleGrid}>
                  {Array.from({ length: q.max - q.min + 1 }, function (_, i) { return i + q.min; }).map(function (val) {
                    return (
                      <TouchableOpacity key={val} style={[st.scaleBtn, current === val && st.scaleBtnSelected]} onPress={function () { setDiaryAnswer(q.key, val); }}>
                        <Text style={[st.scaleBtnText, current === val && st.scaleBtnTextSelected]}>{val}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })}
          <View style={st.row}>
            <TouchableOpacity style={st.btnBack} onPress={function () { setScreen("diary-summary"); }}><Text style={st.btnBackText}>Back</Text></TouchableOpacity>
            <TouchableOpacity style={st.btnSubmit} onPress={function () {
              // Pre-fill bulk text from existing text answers
              var existing = TEXT_QUESTIONS.filter(function (q) { return diaryAnswers[q.key]; })
                .map(function (q) { return q.label + ": " + diaryAnswers[q.key]; }).join("\n");
              setBulkText(existing);
              setScreen("diary-bulk-text");
            }}><Text style={st.btnSubmitText}>Next</Text></TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // --- DIARY BULK TEXT ---
  if (screen === "diary-bulk-text") {
    return (
      <SafeAreaView style={st.container}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, width: "100%" }}>
          <ScrollView contentContainerStyle={st.scrollContent} keyboardShouldPersistTaps="handled">
            <TouchableOpacity onPress={function () { setScreen("idle"); }}><Text style={st.title}>Mnemo</Text></TouchableOpacity>
            <Text style={st.label}>Describe Your Day</Text>
            <Text style={{ color: C.muted, fontSize: 13, marginBottom: 8 }}>Answer any or all of these in one go:</Text>
            {TEXT_QUESTIONS.map(function (q) {
              return <Text key={q.key} style={{ color: C.text, fontSize: 13, marginBottom: 2 }}>{"\u2022 " + q.label + " \u2014 " + q.question}</Text>;
            })}
            <View style={{ height: 12 }} />
            <TextInput
              style={[st.input, { minHeight: 120 }]}
              placeholder="Type or dictate your answers..."
              placeholderTextColor={C.muted}
              value={bulkText}
              onChangeText={setBulkText}
              multiline
              numberOfLines={6}
            />
            <View style={st.row}>
              <TouchableOpacity style={st.btnBack} onPress={function () { setScreen("diary-bulk-scales"); }}><Text style={st.btnBackText}>Back</Text></TouchableOpacity>
              <TouchableOpacity style={st.btnSubmit} onPress={function () {
                if (!bulkText.trim()) {
                  // No text, go straight to review
                  setScreen("diary-review");
                  return;
                }
                // Parse text via API
                setScreen("submitting");
                var questions = TEXT_QUESTIONS.map(function (q) { return { key: q.key, label: q.label }; });
                fetch(API_BASE + "/diary/parse-text", {
                  method: "POST",
                  headers: authHeaders(),
                  body: JSON.stringify({ raw_text: bulkText, questions: questions }),
                }).then(function (res) {
                  if (!res.ok) throw new Error("HTTP " + res.status);
                  return res.json();
                }).then(function (data) {
                  var updated = Object.assign({}, diaryAnswers);
                  Object.keys(data.answers).forEach(function (k) {
                    if (data.answers[k]) updated[k] = data.answers[k];
                  });
                  setDiaryAnswers(updated);
                  setScreen("diary-review");
                }).catch(function (err) {
                  showToastMsg(err.message || "Network error", "error");
                  setScreen("diary-bulk-text");
                });
              }}><Text style={st.btnSubmitText}>Review</Text></TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // --- DIARY STEP ---
  if (screen === "diary-step") {
    var q = DIARY_QUESTIONS[diaryStep];
    var isLast = diaryStep === DIARY_QUESTIONS.length - 1;
    return (
      <SafeAreaView style={st.container}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, width: "100%" }}>
          <ScrollView contentContainerStyle={st.scrollContent} keyboardShouldPersistTaps="handled">
            <TouchableOpacity onPress={function () { setScreen("idle"); }}><Text style={st.title}>Mnemo</Text></TouchableOpacity>
            <Text style={st.progressText}>{diaryStep + 1} / {DIARY_QUESTIONS.length}</Text>
            <Text style={st.label}>{q.label}</Text>
            <Text style={st.question}>{q.question}</Text>
            {q.type === "scale" ? renderScaleGrid(q.key, q.min, q.max) :
              <TextInput style={[st.input, st.textArea]} placeholder="Type your answer..." placeholderTextColor={C.muted} value={diaryAnswers[q.key] || ""} onChangeText={function (t) { setDiaryAnswer(q.key, t); }} multiline numberOfLines={3} />
            }
            <View style={st.row}>
              <TouchableOpacity style={st.btnBack} onPress={function () { if (diaryStep > 0) setDiaryStep(diaryStep - 1); else setScreen("diary-summary"); }}><Text style={st.btnBackText}>{diaryStep === 0 ? "Back" : "Prev"}</Text></TouchableOpacity>
              <TouchableOpacity style={st.btnSubmit} onPress={function () { if (isLast) setScreen("diary-review"); else setDiaryStep(diaryStep + 1); }}><Text style={st.btnSubmitText}>{isLast ? "Review" : "Next"}</Text></TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // --- DIARY REVIEW ---
  if (screen === "diary-review") {
    return (
      <SafeAreaView style={st.container}>
        <ScrollView contentContainerStyle={st.scrollContent}>
          <TouchableOpacity onPress={function () { setScreen("idle"); }}><Text style={st.title}>Mnemo</Text></TouchableOpacity>
          <Text style={st.label}>Review Your Diary</Text>
          {SCALE_QUESTIONS.concat(TEXT_QUESTIONS).map(function (q) {
            var val = diaryAnswers[q.key];
            return <View key={q.key} style={st.reviewItem}><Text style={st.reviewLabel}>{q.label}</Text><Text style={st.reviewValue}>{val !== undefined && val !== "" ? val : "\u2014"}</Text></View>;
          })}
          <View style={st.row}>
            <TouchableOpacity style={st.btnBack} onPress={function () { setDiaryStep(DIARY_QUESTIONS.length - 1); setScreen("diary-step"); }}><Text style={st.btnBackText}>Edit</Text></TouchableOpacity>
            <TouchableOpacity style={st.btnSubmit} onPress={saveDiary}><Text style={st.btnSubmitText}>Save</Text></TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return <SafeAreaView style={st.container}><Text style={st.label}>Unknown screen</Text><TouchableOpacity style={st.btnBack} onPress={function () { setScreen("idle"); }}><Text style={st.btnBackText}>Home</Text></TouchableOpacity></SafeAreaView>;
}

var st = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg, alignItems: "center", paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0, paddingHorizontal: 20 },
  scrollContent: { alignItems: "center", paddingBottom: 40, width: "100%" },
  title: { fontSize: 28, color: C.text, fontWeight: "300", marginTop: 20, marginBottom: 20, letterSpacing: 2 },
  label: { fontSize: 14, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 15 },
  labelSmall: { fontSize: 12, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 },
  idleButtons: { width: "100%", gap: 12 },
  btn: { backgroundColor: C.accent, borderRadius: 25, paddingVertical: 16, alignItems: "center" },
  btnSecondary: { backgroundColor: C.surface },
  btnText: { color: C.text, fontSize: 16, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1 },
  btnSubmit: { backgroundColor: C.accent, borderRadius: 25, paddingVertical: 14, paddingHorizontal: 24, alignItems: "center", flex: 1 },
  btnSubmitText: { color: C.text, fontSize: 14, fontWeight: "600", textTransform: "uppercase" },
  btnBack: { borderRadius: 25, borderWidth: 1, borderColor: C.muted, paddingVertical: 14, paddingHorizontal: 24, alignItems: "center", flex: 1 },
  btnBackText: { color: C.muted, fontSize: 14, fontWeight: "600", textTransform: "uppercase" },
  row: { flexDirection: "row", width: "100%", gap: 12, marginTop: 12 },
  halfRow: { flexDirection: "row", width: "50%", marginTop: 12 },
  datePickerRow: { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 16 },
  input: { width: "100%", backgroundColor: C.input, borderRadius: 25, padding: 14, color: C.text, fontSize: 16, marginBottom: 12 },
  inputText: { color: C.text, fontSize: 16 },
  textArea: { minHeight: 80, textAlignVertical: "top" },
  categoryGrid: { width: "100%", gap: 8 },
  categoryBtn: { backgroundColor: C.surface, borderRadius: 25, paddingVertical: 14, alignItems: "center" },
  categoryBtnText: { color: C.text, fontSize: 14, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1 },
  submitNewSection: { width: "100%", marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: C.input },
  historyTabs: { flexDirection: "row", width: "100%", gap: 8, marginBottom: 12 },
  historyTab: { flex: 1, backgroundColor: C.surface, borderRadius: 25, paddingVertical: 10, alignItems: "center" },
  historyTabActive: { backgroundColor: C.accent },
  historyTabText: { color: C.muted, fontSize: 14, fontWeight: "600" },
  historyTabTextActive: { color: C.text },
  historyScroll: { flex: 1, width: "100%" },
  historyScrollContent: { gap: 8, paddingBottom: 20 },
  eventCard: { backgroundColor: C.surface, borderRadius: 15, padding: 12 },
  eventHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  badge: { backgroundColor: C.input, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { color: C.text, fontSize: 11, fontWeight: "600", textTransform: "uppercase" },
  eventTime: { color: C.muted, fontSize: 12 },
  eventText: { color: C.text, fontSize: 14, lineHeight: 20 },
  editBtn: { marginTop: 8, borderWidth: 1, borderColor: C.muted, borderRadius: 25, paddingVertical: 6, paddingHorizontal: 14, alignSelf: "flex-start" },
  editBtnText: { color: C.muted, fontSize: 12, fontWeight: "600" },
  emptyText: { color: C.muted, fontSize: 14, textAlign: "center", marginTop: 20 },
  summaryBox: { backgroundColor: C.surface, borderRadius: 15, padding: 14, width: "100%", marginBottom: 16 },
  summaryText: { color: C.text, fontSize: 14, lineHeight: 20 },
  progressText: { color: C.muted, fontSize: 12, marginBottom: 8 },
  question: { color: C.text, fontSize: 16, marginBottom: 16, textAlign: "center" },
  scaleGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, marginBottom: 16, width: "100%" },
  scaleBtn: { backgroundColor: C.surface, borderRadius: 8, width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  scaleBtnSelected: { backgroundColor: C.accent },
  scaleBtnText: { color: C.text, fontSize: 16, fontWeight: "600" },
  scaleBtnTextSelected: { color: "#fff" },
  reviewItem: { backgroundColor: C.surface, borderRadius: 15, padding: 12, width: "100%", marginBottom: 8 },
  reviewLabel: { color: C.muted, fontSize: 12, textTransform: "uppercase", marginBottom: 4 },
  reviewValue: { color: C.text, fontSize: 14 },
  settingsBtn: { position: "absolute", bottom: 60 },
  settingsBtnText: { color: C.muted, fontSize: 12 },
  version: { position: "absolute", bottom: 30, color: C.muted, fontSize: 12 },
  toast: { position: "absolute", bottom: 100, borderRadius: 25, paddingVertical: 10, paddingHorizontal: 20 },
  toastSuccess: { backgroundColor: C.success },
  toastError: { backgroundColor: C.error },
  toastText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
