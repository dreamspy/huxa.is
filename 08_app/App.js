import React, { useState, useEffect, useRef, useMemo } from "react";
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
  Alert,
  AppState,
  Image,
  useColorScheme,
} from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import * as SystemUI from "expo-system-ui";
import * as ImagePicker from "expo-image-picker";
var DateTimePicker = Platform.OS === "web" ? null : require("@react-native-community/datetimepicker").default;

const API_BASE = process.env.EXPO_PUBLIC_API_BASE || "https://huxa.is";
const APP_VERSION = "0.2.16";

const COLOR_PROFILES = {
  dark: {
    name: "Dark",
    bg: "#162032",
    surface: "#1e3050",
    input: "#2a4570",
    text: "#e0ecf0",
    muted: "#7a9ab0",
    accent: "#e87070",
    success: "#5ec4d4",
    error: "#f07070",
    radius: 10,
    statusBar: "light-content",
  },
  light: {
    name: "Light",
    bg: "#f0f4f8",
    surface: "#ffffff",
    input: "#dce4ee",
    text: "#1a2540",
    muted: "#6b7c93",
    accent: "#d65060",
    success: "#3bada4",
    error: "#d94545",
    radius: 10,
    statusBar: "dark-content",
  },
};
const PROFILE_KEYS = ["auto"].concat(Object.keys(COLOR_PROFILES));
const DEFAULT_PROFILE = "auto";

function resolveProfile(profileKey, osScheme) {
  if (profileKey === "auto") {
    return osScheme === "light" ? "light" : "dark";
  }
  return profileKey;
}

function getColors(profileKey, osScheme) {
  var resolved = resolveProfile(profileKey, osScheme);
  return COLOR_PROFILES[resolved] || COLOR_PROFILES.dark;
}

function makeStyles(C) {
  return StyleSheet.create({
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
    halfRow: { flexDirection: "row", width: "50%", marginTop: 12, marginBottom: 16 },
    datePickerRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginBottom: 16 },
    dateArrowLeft: { color: C.muted, fontSize: 18, marginRight: Platform.OS === "web" ? 4 : -4 },
    dateArrowRight: { color: C.muted, fontSize: 18, marginLeft: Platform.OS === "web" ? 4 : 6, marginRight: Platform.OS === "web" ? 18 : 0 },
    input: { width: "100%", backgroundColor: C.input, borderRadius: 25, padding: 14, color: C.text, fontSize: 16, marginBottom: 12, outlineOffset: -2 },
    inputText: { color: C.text, fontSize: 16 },
    textArea: { minHeight: 80, textAlignVertical: "top", borderRadius: 12 },
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
    scaleGrid: { marginBottom: 16, width: "100%", gap: 8 },
    scaleRow: { flexDirection: "row", justifyContent: "flex-start", gap: 8, width: "100%" },
    scaleBtn: { backgroundColor: C.surface, borderRadius: 8, flex: 1, height: 50, alignItems: "center", justifyContent: "center" },
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
    profileRow: { flexDirection: "row", width: "100%", gap: 8, marginBottom: 16 },
    profileBtn: { flex: 1, borderRadius: 25, paddingVertical: 12, alignItems: "center", borderWidth: 2, borderColor: "transparent" },
    profileBtnActive: { borderColor: C.accent },
    profileBtnText: { fontSize: 13, fontWeight: "600" },
    profileSwatch: { width: 24, height: 24, borderRadius: 12, marginBottom: 4, borderWidth: 1, borderColor: C.muted },
    settingsSectionLabel: { fontSize: 12, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, marginTop: 20, alignSelf: "flex-start" },
  });
}

function WebDateInput(props) {
  var inputRef = useRef(null);
  var colors = props.colors;
  var val = props.mode === "time"
    ? props.value.toTimeString().slice(0, 5)
    : props.value.toISOString().slice(0, 10);
  return React.createElement("input", {
    ref: inputRef,
    type: props.mode === "time" ? "time" : "date",
    value: val,
    onClick: function (e) { e.stopPropagation(); if (inputRef.current && inputRef.current.showPicker) inputRef.current.showPicker(); },
    onChange: function (e) {
      var d = new Date(props.value);
      if (props.mode === "time") {
        var parts = e.target.value.split(":");
        d.setHours(parseInt(parts[0], 10), parseInt(parts[1], 10));
      } else {
        var dp = e.target.value.split("-");
        d = new Date(parseInt(dp[0], 10), parseInt(dp[1], 10) - 1, parseInt(dp[2], 10), props.value.getHours(), props.value.getMinutes());
      }
      if (props.onChange) props.onChange(null, d);
    },
    style: { backgroundColor: colors.surface, color: colors.text, border: "1px solid " + colors.muted, borderRadius: 8, padding: 8, fontSize: 16 },
  });
}

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
const DIARY_STEPS = SCALE_QUESTIONS.concat(TEXT_QUESTIONS);
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

function shiftDate(date, days) {
  var d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function confirmAction(title, message, onConfirm) {
  if (Platform.OS === "web") {
    if (window.confirm(title + "\n" + message)) onConfirm();
  } else {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: onConfirm },
    ]);
  }
}

export default function App() {
  return <SafeAreaProvider><AppContent /></SafeAreaProvider>;
}

function AppContent() {
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
  var _w = useState(""), queryText = _w[0], setQueryText = _w[1];
  var _x = useState(""), queryAnswer = _x[0], setQueryAnswer = _x[1];
  var _y = useState(false), queryLoading = _y[0], setQueryLoading = _y[1];

  var _fb1 = useState("feature"), feedbackType = _fb1[0], setFeedbackType = _fb1[1];
  var _fb2 = useState(""), feedbackText = _fb2[0], setFeedbackText = _fb2[1];
  var _fb3 = useState(null), feedbackPrevScreen = _fb3[0], setFeedbackPrevScreen = _fb3[1];
  var _fb4 = useState([]), feedbackList = _fb4[0], setFeedbackList = _fb4[1];
  var _fb5 = useState(false), feedbackShowList = _fb5[0], setFeedbackShowList = _fb5[1];
  var _fb6 = useState(null), feedbackImage = _fb6[0], setFeedbackImage = _fb6[1];

  var _cp = useState(DEFAULT_PROFILE), colorProfile = _cp[0], setColorProfile = _cp[1];
  var osScheme = useColorScheme();
  var C = useMemo(function () { return getColors(colorProfile, osScheme); }, [colorProfile, osScheme]);
  var st = useMemo(function () { return makeStyles(C); }, [C]);

  useEffect(function () {
    var envToken = process.env.EXPO_PUBLIC_AUTH_TOKEN;
    if (envToken) { setToken(envToken); }
    else { AsyncStorage.getItem("huxa_token").then(function (t) { if (t) setToken(t); }); }
    AsyncStorage.getItem("huxa_color_profile").then(function (p) { if (p && COLOR_PROFILES[p]) setColorProfile(p); });
    loadQueue();
  }, []);

  useEffect(function () {
    SystemUI.setBackgroundColorAsync(C.bg);
  }, [C.bg]);

  function showToastMsg(msg, type) {
    setToast({ msg: msg, type: type });
    setTimeout(function () { setToast(null); }, 3000);
  }

  function saveTokenFn() {
    var t = tokenInput.trim();
    if (t) {
      AsyncStorage.setItem("huxa_token", t);
      setToken(t);
      showToastMsg("Token saved", "success");
      setScreen("idle");
    }
  }

  function saveColorProfile(key) {
    setColorProfile(key);
    AsyncStorage.setItem("huxa_color_profile", key);
  }

  function authHeaders() {
    return { "Content-Type": "application/json", Authorization: "Bearer " + token };
  }

  function loadQueue() {
    AsyncStorage.getItem("huxa_queue").then(function (val) {
      try { setQueue(JSON.parse(val || "[]")); } catch (e) { setQueue([]); }
    });
  }

  function saveQueueItems(items) {
    AsyncStorage.setItem("huxa_queue", JSON.stringify(items));
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
      var endpoint = item.kind === "diary" ? "/diary" : item.kind === "feedback" ? "/reports" : "/events";
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

  var processQueueRef = useRef(processQueueFn);
  processQueueRef.current = processQueueFn;
  var queueRef = useRef(queue);
  queueRef.current = queue;

  useEffect(function () {
    var unsubNetInfo = NetInfo.addEventListener(function (state) {
      if (state.isConnected && queueRef.current.length > 0) {
        processQueueRef.current();
      }
    });
    var onAppState = function (nextState) {
      if (nextState === "active" && queueRef.current.length > 0) {
        processQueueRef.current();
      }
    };
    var sub = AppState.addEventListener("change", onAppState);
    return function () { unsubNetInfo(); sub.remove(); };
  }, []);

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
          showToastMsg(isEditing ? "Updated" : "Logged", "success");
          if (isEditing) { setScreen("history"); doFetchHistory(historyTab, historyDate); }
          else { setScreen("idle"); }
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

  function deleteEvent(ev) {
    confirmAction("Delete Event", "Are you sure you want to delete this event?", function () {
      fetch(API_BASE + "/events/" + ev.id, { method: "DELETE", headers: authHeaders() })
        .then(function (res) { if (!res.ok) throw new Error("HTTP " + res.status); showToastMsg("Deleted", "success"); doFetchHistory(historyTab, historyDate); })
        .catch(function (err) { showToastMsg(err.message, "error"); });
    });
  }

  function deleteDiary(date) {
    confirmAction("Delete Diary", "Are you sure you want to delete this diary entry?", function () {
      fetch(API_BASE + "/diary/" + date, { method: "DELETE", headers: authHeaders() })
        .then(function (res) { if (!res.ok) throw new Error("HTTP " + res.status); showToastMsg("Deleted", "success"); doFetchHistory(historyTab, historyDate); })
        .catch(function (err) { showToastMsg(err.message, "error"); });
    });
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
      showToastMsg(err.message, "error"); setScreen("idle");
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

  function submitQuery() {
    var q = queryText.trim();
    if (!q) return;
    if (!token) { setScreen("token"); return; }
    setQueryLoading(true);
    setQueryAnswer("");
    fetch(API_BASE + "/query", { method: "POST", headers: authHeaders(), body: JSON.stringify({ question: q }) })
      .then(function (res) { if (!res.ok) throw new Error("HTTP " + res.status); return res.json(); })
      .then(function (data) { setQueryAnswer(data.answer); setQueryLoading(false); })
      .catch(function (err) { setQueryAnswer("Error: " + (err.message || "Network error")); setQueryLoading(false); });
  }

  function renderScaleGrid(questionKey, min, max, onSelect) {
    var current = diaryAnswers[questionKey];
    var buttons = [];
    for (var i = min; i <= max; i++) {
      (function (val) {
        buttons.push(
          <TouchableOpacity key={val} style={[st.scaleBtn, current === val && st.scaleBtnSelected]} onPress={function () { setDiaryAnswer(questionKey, val); if (onSelect) setTimeout(onSelect, 200); }}>
            <Text style={[st.scaleBtnText, current === val && st.scaleBtnTextSelected]}>{val}</Text>
          </TouchableOpacity>
        );
      })(i);
    }
    var rows = [];
    for (var r = 0; r < buttons.length; r += 5) {
      rows.push(<View key={r} style={st.scaleRow}>{buttons.slice(r, r + 5)}</View>);
    }
    return <View style={st.scaleGrid}>{rows}</View>;
  }

  function renderToast() {
    if (!toast) return null;
    return <View style={[st.toast, toast.type === "success" ? st.toastSuccess : st.toastError]}><Text style={st.toastText}>{toast.msg}</Text></View>;
  }

  // --- IDLE ---
  if (screen === "idle") {
    return (
      <SafeAreaView style={st.container}>
        <StatusBar barStyle={C.statusBar} />
        <TouchableOpacity onPress={function () { setScreen("idle"); }} onLongPress={function () { setFeedbackPrevScreen(screen); setFeedbackType("feature"); setFeedbackText(""); setFeedbackImage(null); setScreen("feedback"); }}><Text style={st.title}>HuXa</Text></TouchableOpacity>
        <View style={st.idleButtons}>
          <TouchableOpacity style={st.btn} onPress={function () { if (!token) setScreen("token"); else setScreen("category"); }}><Text style={st.btnText}>Log</Text></TouchableOpacity>
          <TouchableOpacity style={[st.btn, st.btnSecondary]} onPress={function () { if (!token) setScreen("token"); else startDiary(todayStr()); }}><Text style={st.btnText}>Diary</Text></TouchableOpacity>
          <TouchableOpacity style={[st.btn, st.btnSecondary]} onPress={openHistory}><Text style={st.btnText}>History</Text></TouchableOpacity>
          <TouchableOpacity style={[st.btn, st.btnSecondary]} onPress={function () { if (!token) setScreen("token"); else { setQueryText(""); setQueryAnswer(""); setScreen("query"); } }}><Text style={st.btnText}>Ask HuXa</Text></TouchableOpacity>
          {queue.length > 0 && <TouchableOpacity style={[st.btn, { backgroundColor: C.input }]} onPress={function () { setScreen("queue"); }}><Text style={st.btnText}>{queue.length} pending</Text></TouchableOpacity>}
        </View>
        <TouchableOpacity style={st.settingsBtn} onPress={function () { setTokenInput(token); setScreen("token"); }}><Text style={st.settingsBtnText}>Settings</Text></TouchableOpacity>
        <Text style={st.version}>v{APP_VERSION}</Text>
        {renderToast()}
      </SafeAreaView>
    );
  }

  // --- QUEUE ---
  if (screen === "queue") {
    var removeFromQueue = function (id) {
      confirmAction("Remove", "Remove this item from the queue?", function () {
        saveQueueItems(queue.filter(function (q) { return q.id !== id; }));
      });
    };
    return (
      <SafeAreaView style={st.container}>
        <TouchableOpacity onPress={function () { setScreen("idle"); }} onLongPress={function () { setFeedbackPrevScreen(screen); setFeedbackType("feature"); setFeedbackText(""); setFeedbackImage(null); setScreen("feedback"); }}><Text style={st.title}>HuXa</Text></TouchableOpacity>
        <Text style={st.label}>Pending Events ({queue.length})</Text>
        <ScrollView style={st.historyScroll} contentContainerStyle={st.historyScrollContent}>
          {queue.map(function (item) {
            var d = new Date(item.created_at);
            var time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            var date = d.toLocaleDateString();
            var label = item.kind === "diary" ? "Diary" : (item.payload && item.payload.type ? item.payload.type : "Event");
            var detail = item.kind === "diary"
              ? (item.payload && item.payload.date ? item.payload.date : "")
              : (item.payload && item.payload.text ? item.payload.text : "");
            return (
              <View key={item.id} style={st.eventCard}>
                <View style={st.eventHeader}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={st.badge}><Text style={st.badgeText}>{label}</Text></View>
                    {item.status === "failed" && <View style={[st.badge, { backgroundColor: C.error }]}><Text style={st.badgeText}>Failed</Text></View>}
                  </View>
                  <Text style={st.eventTime}>{date} {time}</Text>
                </View>
                <Text style={st.eventText} numberOfLines={2}>{detail}</Text>
                {item.error && <Text style={{ color: C.error, fontSize: 12, marginTop: 4 }}>{item.error}</Text>}
                <TouchableOpacity style={st.editBtn} onPress={function () { removeFromQueue(item.id); }}>
                  <Text style={st.editBtnText}>Remove</Text>
                </TouchableOpacity>
              </View>
            );
          })}
          {queue.length === 0 && <Text style={st.emptyText}>Queue is empty</Text>}
        </ScrollView>
        <View style={[st.row, { marginBottom: 20 }]}>
          <TouchableOpacity style={st.btnBack} onPress={function () { setScreen("idle"); }}><Text style={st.btnBackText}>Back</Text></TouchableOpacity>
          <TouchableOpacity style={st.btnSubmit} onPress={function () { processQueueFn(); showToastMsg("Syncing...", "success"); }}><Text style={st.btnSubmitText}>Sync All</Text></TouchableOpacity>
        </View>
        {renderToast()}
      </SafeAreaView>
    );
  }

  // --- SETTINGS ---
  if (screen === "token") {
    return (
      <SafeAreaView style={st.container}>
        <TouchableOpacity onPress={function () { setScreen("idle"); }} onLongPress={function () { setFeedbackPrevScreen(screen); setFeedbackType("feature"); setFeedbackText(""); setFeedbackImage(null); setScreen("feedback"); }}><Text style={st.title}>HuXa</Text></TouchableOpacity>
        <Text style={st.label}>Settings</Text>
        <Text style={st.settingsSectionLabel}>API Token</Text>
        <TextInput style={st.input} placeholder="Bearer token" placeholderTextColor={C.muted} value={tokenInput} onChangeText={setTokenInput} autoCapitalize="none" autoCorrect={false} onSubmitEditing={saveTokenFn} returnKeyType="done" />
        <Text style={st.settingsSectionLabel}>Color Profile</Text>
        <View style={st.profileRow}>
          {PROFILE_KEYS.map(function (key) {
            var isAuto = key === "auto";
            var resolved = isAuto ? resolveProfile("auto", osScheme) : key;
            var prof = COLOR_PROFILES[resolved];
            var isActive = key === colorProfile;
            var label = isAuto ? "Auto" : prof.name;
            return (
              <TouchableOpacity key={key} style={[st.profileBtn, { backgroundColor: prof.surface }, isActive ? st.profileBtnActive : null]} onPress={function () { saveColorProfile(key); }}>
                {isAuto
                  ? <View style={{ flexDirection: "row", marginBottom: 4 }}>
                      <View style={[st.profileSwatch, { backgroundColor: COLOR_PROFILES.dark.accent, borderColor: prof.muted, width: 14, height: 24, borderRadius: 0, borderTopLeftRadius: 12, borderBottomLeftRadius: 12, marginBottom: 0 }]} />
                      <View style={[st.profileSwatch, { backgroundColor: COLOR_PROFILES.light.accent, borderColor: prof.muted, width: 14, height: 24, borderRadius: 0, borderTopRightRadius: 12, borderBottomRightRadius: 12, marginBottom: 0, borderLeftWidth: 0 }]} />
                    </View>
                  : <View style={[st.profileSwatch, { backgroundColor: prof.accent, borderColor: prof.muted }]} />
                }
                <Text style={[st.profileBtnText, { color: prof.text }]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
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
        <TouchableOpacity onPress={function () { setScreen("idle"); }} onLongPress={function () { setFeedbackPrevScreen(screen); setFeedbackType("feature"); setFeedbackText(""); setFeedbackImage(null); setScreen("feedback"); }}><Text style={st.title}>HuXa</Text></TouchableOpacity>
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
            <TouchableOpacity onPress={function () { setScreen("idle"); }} onLongPress={function () { setFeedbackPrevScreen(screen); setFeedbackType("feature"); setFeedbackText(""); setFeedbackImage(null); setScreen("feedback"); }}><Text style={st.title}>HuXa</Text></TouchableOpacity>
            <Text style={st.label}>{editingEventId ? "Edit " : "New "}{selectedType}</Text>
            <View style={st.datePickerRow}>
              <TouchableOpacity onPress={function () { setComposeDate(shiftDate(composeDate, -1)); }}><Text style={st.dateArrowLeft}>{"\u25C0"}</Text></TouchableOpacity>
              {Platform.OS === "web" ? <WebDateInput colors={C} value={composeDate} mode="date" onChange={function (e, date) { if (date) setComposeDate(date); }} /> : <DateTimePicker value={composeDate} mode="date" display="compact" themeVariant="dark" onChange={function (e, date) { if (date) setComposeDate(date); }} />}
              <TouchableOpacity onPress={function () { setComposeDate(shiftDate(composeDate, 1)); }}><Text style={st.dateArrowRight}>{"\u25B6"}</Text></TouchableOpacity>
              {Platform.OS === "web" ? <WebDateInput colors={C} value={composeDate} mode="time" onChange={function (e, date) { if (date) setComposeDate(date); }} /> : <DateTimePicker value={composeDate} mode="time" display="compact" themeVariant="dark" onChange={function (e, date) { if (date) setComposeDate(date); }} />}
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

  // --- QUERY ---
  if (screen === "query") {
    return (
      <SafeAreaView style={st.container}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, width: "100%" }}>
          <ScrollView contentContainerStyle={st.scrollContent} keyboardShouldPersistTaps="handled">
            <TouchableOpacity onPress={function () { setScreen("idle"); }} onLongPress={function () { setFeedbackPrevScreen(screen); setFeedbackType("feature"); setFeedbackText(""); setFeedbackImage(null); setScreen("feedback"); }}><Text style={st.title}>HuXa</Text></TouchableOpacity>
            <Text style={st.label}>Ask HuXa</Text>
            <TextInput
              style={st.input}
              placeholder="e.g. How many events this week?"
              placeholderTextColor={C.muted}
              value={queryText}
              onChangeText={setQueryText}
              returnKeyType="send"
              onSubmitEditing={submitQuery}
            />
            <View style={st.row}>
              <TouchableOpacity style={st.btnBack} onPress={function () { setScreen("idle"); }}><Text style={st.btnBackText}>Back</Text></TouchableOpacity>
              <TouchableOpacity style={st.btnSubmit} onPress={submitQuery}><Text style={st.btnSubmitText}>Ask</Text></TouchableOpacity>
            </View>
            {queryLoading && <Text style={[st.emptyText, { marginTop: 20 }]}>Thinking...</Text>}
            {!queryLoading && queryAnswer !== "" && (
              <View style={[st.summaryBox, { marginTop: 20 }]}><Text style={st.summaryText}>{queryAnswer}</Text></View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // --- HISTORY ---
  if (screen === "history") {
    return (
      <SafeAreaView style={st.container}>
        <TouchableOpacity onPress={function () { setScreen("idle"); }} onLongPress={function () { setFeedbackPrevScreen(screen); setFeedbackType("feature"); setFeedbackText(""); setFeedbackImage(null); setScreen("feedback"); }}><Text style={st.title}>HuXa</Text></TouchableOpacity>
        <Text style={st.label}>History</Text>
        <View style={st.datePickerRow}>
          <TouchableOpacity onPress={function () { var d = shiftDate(new Date(historyDate + "T12:00:00"), -1).toISOString().slice(0, 10); setHistoryDate(d); doFetchHistory(historyTab, d); }}><Text style={st.dateArrowLeft}>{"\u25C0"}</Text></TouchableOpacity>
          {Platform.OS === "web" ? <WebDateInput colors={C} value={new Date(historyDate + "T12:00:00")} mode="date" onChange={function (e, date) { if (date) { var d = date.toISOString().slice(0, 10); setHistoryDate(d); doFetchHistory(historyTab, d); } }} /> : <DateTimePicker value={new Date(historyDate + "T12:00:00")} mode="date" display="compact" themeVariant="dark" onChange={function (e, date) { if (date) { var d = date.toISOString().slice(0, 10); setHistoryDate(d); doFetchHistory(historyTab, d); } }} />}
          <TouchableOpacity onPress={function () { var d = shiftDate(new Date(historyDate + "T12:00:00"), 1).toISOString().slice(0, 10); setHistoryDate(d); doFetchHistory(historyTab, d); }}><Text style={st.dateArrowRight}>{"\u25B6"}</Text></TouchableOpacity>
        </View>
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
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TouchableOpacity style={st.editBtn} onPress={function () { editEvent(ev); }}><Text style={st.editBtnText}>Edit</Text></TouchableOpacity>
                    <TouchableOpacity style={[st.editBtn, { borderColor: C.error }]} onPress={function () { deleteEvent(ev); }}><Text style={[st.editBtnText, { color: C.error }]}>Delete</Text></TouchableOpacity>
                  </View>
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
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TouchableOpacity style={st.editBtn} onPress={function () { setDiaryDate(historyDate); setDiaryAnswers(historyDiary.answers || {}); setDiaryStep(0); setScreen("diary-step"); }}><Text style={st.editBtnText}>Edit Diary</Text></TouchableOpacity>
                <TouchableOpacity style={[st.editBtn, { borderColor: C.error }]} onPress={function () { deleteDiary(historyDate); }}><Text style={[st.editBtnText, { color: C.error }]}>Delete Diary</Text></TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
        <View style={st.halfRow}><TouchableOpacity style={st.btnBack} onPress={function () { setScreen("idle"); }}><Text style={st.btnBackText}>Back</Text></TouchableOpacity></View>
        {renderToast()}
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
          <TouchableOpacity onPress={function () { setScreen("idle"); }} onLongPress={function () { setFeedbackPrevScreen(screen); setFeedbackType("feature"); setFeedbackText(""); setFeedbackImage(null); setScreen("feedback"); }}><Text style={st.title}>HuXa</Text></TouchableOpacity>
          <Text style={st.label}>Diary</Text>
          <View style={st.datePickerRow}>
            <TouchableOpacity onPress={function () { var d = shiftDate(new Date(diaryDate + "T12:00:00"), -1).toISOString().slice(0, 10); startDiary(d); }}><Text style={st.dateArrowLeft}>{"\u25C0"}</Text></TouchableOpacity>
            {Platform.OS === "web" ? <WebDateInput colors={C} value={new Date(diaryDate + "T12:00:00")} mode="date" onChange={function (e, date) { if (date) { startDiary(date.toISOString().slice(0, 10)); } }} /> : <DateTimePicker value={new Date(diaryDate + "T12:00:00")} mode="date" display="compact" themeVariant="dark" onChange={function (e, date) { if (date) { startDiary(date.toISOString().slice(0, 10)); } }} />}
            <TouchableOpacity onPress={function () { var d = shiftDate(new Date(diaryDate + "T12:00:00"), 1).toISOString().slice(0, 10); startDiary(d); }}><Text style={st.dateArrowRight}>{"\u25B6"}</Text></TouchableOpacity>
          </View>
          <View style={st.summaryBox}><Text style={st.summaryText}>{diarySummary}</Text></View>
          {diaryHasExisting && SCALE_QUESTIONS.concat(TEXT_QUESTIONS).map(function (q) {
            var ans = diaryAnswers[q.key];
            if (ans === undefined || ans === "") return null;
            var display = typeof ans === "object" ? String(ans) : String(ans);
            return <View key={q.key} style={st.reviewItem}><Text style={st.reviewLabel}>{q.label}</Text><Text style={st.reviewValue}>{display}</Text></View>;
          })}
          {diaryHasExisting ? (
            <View style={st.row}>
              <TouchableOpacity style={st.btnBack} onPress={function () { setScreen("idle"); }}><Text style={st.btnBackText}>Looks Good</Text></TouchableOpacity>
              <TouchableOpacity style={st.btnSubmit} onPress={function () { setDiaryStep(0); setScreen("diary-step"); }}><Text style={st.btnSubmitText}>Edit</Text></TouchableOpacity>
            </View>
          ) : (
            <View style={st.row}>
              <TouchableOpacity style={st.btnBack} onPress={function () {
                NetInfo.fetch().then(function (state) {
                  if (state.isConnected) { setScreen("diary-bulk-scales"); }
                  else { showToastMsg("Quick Entry needs internet for AI parsing", "error"); }
                });
              }}><Text style={st.btnBackText}>Quick Entry</Text></TouchableOpacity>
              <TouchableOpacity style={st.btnSubmit} onPress={function () { setDiaryStep(0); setScreen("diary-step"); }}><Text style={st.btnSubmitText}>Continue</Text></TouchableOpacity>
            </View>
          )}
        </ScrollView>
        {renderToast()}
      </SafeAreaView>
    );
  }

  // --- DIARY BULK SCALES ---
  if (screen === "diary-bulk-scales") {
    return (
      <SafeAreaView style={st.container}>
        <ScrollView contentContainerStyle={st.scrollContent} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={function () { setScreen("idle"); }} onLongPress={function () { setFeedbackPrevScreen(screen); setFeedbackType("feature"); setFeedbackText(""); setFeedbackImage(null); setScreen("feedback"); }}><Text style={st.title}>HuXa</Text></TouchableOpacity>
          <Text style={st.label}>Rate Your Day</Text>
          {SCALE_QUESTIONS.map(function (q) {
            var current = diaryAnswers[q.key];
            return (
              <View key={q.key} style={{ width: "100%", marginBottom: 16 }}>
                <Text style={st.labelSmall}>{q.label}</Text>
                <View style={st.scaleGrid}>
                  {(function () {
                    var vals = Array.from({ length: q.max - q.min + 1 }, function (_, i) { return i + q.min; });
                    var rows = [];
                    for (var r = 0; r < vals.length; r += 5) {
                      rows.push(<View key={r} style={st.scaleRow}>{vals.slice(r, r + 5).map(function (val) {
                        return (
                          <TouchableOpacity key={val} style={[st.scaleBtn, current === val && st.scaleBtnSelected]} onPress={function () { setDiaryAnswer(q.key, val); }}>
                            <Text style={[st.scaleBtnText, current === val && st.scaleBtnTextSelected]}>{val}</Text>
                          </TouchableOpacity>
                        );
                      })}</View>);
                    }
                    return rows;
                  })()}
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
            <TouchableOpacity onPress={function () { setScreen("idle"); }} onLongPress={function () { setFeedbackPrevScreen(screen); setFeedbackType("feature"); setFeedbackText(""); setFeedbackImage(null); setScreen("feedback"); }}><Text style={st.title}>HuXa</Text></TouchableOpacity>
            <Text style={st.label}>Describe Your Day</Text>
            <View style={{ width: "100%", alignItems: "flex-start" }}>
              <Text style={{ color: C.muted, fontSize: 13, marginBottom: 8 }}>Answer any or all of these in one go:</Text>
              {TEXT_QUESTIONS.map(function (q) {
                return <Text key={q.key} style={{ color: C.text, fontSize: 13, marginBottom: 2 }}>{"\u2022 " + q.label + " \u2014 " + q.question}</Text>;
              })}
            </View>
            <View style={{ height: 12 }} />
            <TextInput
              style={[st.input, st.textArea, { minHeight: 120 }]}
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
    var q = DIARY_STEPS[diaryStep];
    var isLast = diaryStep === DIARY_STEPS.length - 1;
    return (
      <SafeAreaView style={st.container}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, width: "100%" }}>
          <ScrollView contentContainerStyle={st.scrollContent} keyboardShouldPersistTaps="handled">
            <TouchableOpacity onPress={function () { setScreen("idle"); }} onLongPress={function () { setFeedbackPrevScreen(screen); setFeedbackType("feature"); setFeedbackText(""); setFeedbackImage(null); setScreen("feedback"); }}><Text style={st.title}>HuXa</Text></TouchableOpacity>
            <Text style={st.progressText}>{diaryStep + 1} / {DIARY_STEPS.length}</Text>
            <Text style={st.label}>{q.label}</Text>
            <Text style={st.question}>{q.question}</Text>
            {q.type === "scale" ? renderScaleGrid(q.key, q.min, q.max, function () { if (isLast) setScreen("diary-review"); else setDiaryStep(diaryStep + 1); }) :
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
          <TouchableOpacity onPress={function () { setScreen("idle"); }} onLongPress={function () { setFeedbackPrevScreen(screen); setFeedbackType("feature"); setFeedbackText(""); setFeedbackImage(null); setScreen("feedback"); }}><Text style={st.title}>HuXa</Text></TouchableOpacity>
          <Text style={st.label}>Review Your Diary</Text>
          {SCALE_QUESTIONS.concat(TEXT_QUESTIONS).map(function (q) {
            var val = diaryAnswers[q.key];
            return <View key={q.key} style={st.reviewItem}><Text style={st.reviewLabel}>{q.label}</Text><Text style={st.reviewValue}>{val !== undefined && val !== "" ? val : "\u2014"}</Text></View>;
          })}
          <View style={st.row}>
            <TouchableOpacity style={st.btnBack} onPress={function () { setDiaryStep(DIARY_STEPS.length - 1); setScreen("diary-step"); }}><Text style={st.btnBackText}>Edit</Text></TouchableOpacity>
            <TouchableOpacity style={st.btnSubmit} onPress={saveDiary}><Text style={st.btnSubmitText}>Save</Text></TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // --- FEEDBACK ---
  if (screen === "feedback") {
    var pickImage = function () {
      ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
      }).then(function (result) {
        if (!result.canceled && result.assets && result.assets.length > 0) {
          setFeedbackImage(result.assets[0]);
        }
      });
    };

    var uploadAttachment = function (reportId, imageAsset) {
      var formData = new FormData();
      var uri = imageAsset.uri;
      var filename = uri.split("/").pop() || "photo.jpg";
      var match = /\.(\w+)$/.exec(filename);
      var mimeType = imageAsset.mimeType || (match ? "image/" + match[1].replace("jpg", "jpeg") : "image/jpeg");
      if (Platform.OS === "web") {
        return fetch(uri)
          .then(function (r) { return r.blob(); })
          .then(function (blob) {
            formData.append("file", blob, filename);
            return fetch(API_BASE + "/reports/" + reportId + "/attachment", {
              method: "POST",
              headers: { Authorization: "Bearer " + token },
              body: formData,
            });
          });
      }
      formData.append("file", { uri: uri, name: filename, type: mimeType });
      return fetch(API_BASE + "/reports/" + reportId + "/attachment", {
        method: "POST",
        headers: { Authorization: "Bearer " + token },
        body: formData,
      });
    };

    return (
      <SafeAreaView style={st.container}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, width: "100%" }}>
          <ScrollView contentContainerStyle={st.scrollContent} keyboardShouldPersistTaps="handled">
            <TouchableOpacity onPress={function () { setScreen(feedbackPrevScreen || "idle"); }}><Text style={st.title}>HuXa</Text></TouchableOpacity>
            <Text style={st.label}>Feedback</Text>
            <View style={st.row}>
              <TouchableOpacity style={[st.btnSubmit, feedbackType === "feature" ? {} : { backgroundColor: C.surface }]} onPress={function () { setFeedbackType("feature"); }}><Text style={st.btnSubmitText}>Feature</Text></TouchableOpacity>
              <TouchableOpacity style={[st.btnSubmit, feedbackType === "bug" ? { backgroundColor: C.error } : { backgroundColor: C.surface }]} onPress={function () { setFeedbackType("bug"); }}><Text style={st.btnSubmitText}>Bug</Text></TouchableOpacity>
            </View>
            <View style={{ height: 12 }} />
            <TextInput
              style={[st.input, st.textArea, { minHeight: 100 }]}
              placeholder={feedbackType === "bug" ? "Describe the bug..." : "Describe the feature..."}
              placeholderTextColor={C.muted}
              value={feedbackText}
              onChangeText={setFeedbackText}
              multiline
              numberOfLines={4}
              autoFocus
            />
            <TouchableOpacity style={[st.btnBack, { marginTop: 8, alignSelf: "flex-start" }]} onPress={pickImage}>
              <Text style={st.btnBackText}>{feedbackImage ? "Change Image" : "Attach Image"}</Text>
            </TouchableOpacity>
            {feedbackImage && (
              <View style={{ marginTop: 8, alignItems: "center" }}>
                <Image source={{ uri: feedbackImage.uri }} style={{ width: 200, height: 150, borderRadius: C.radius }} resizeMode="cover" />
                <TouchableOpacity style={{ marginTop: 4 }} onPress={function () { setFeedbackImage(null); }}>
                  <Text style={{ color: C.error, fontSize: 12 }}>Remove</Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={[st.row, { marginTop: 12 }]}>
              <TouchableOpacity style={st.btnBack} onPress={function () { setScreen(feedbackPrevScreen || "idle"); setFeedbackImage(null); }}><Text style={st.btnBackText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={st.btnSubmit} onPress={function () {
                if (!token) { showToastMsg("Set your token in Settings first", "error"); return; }
                if (!feedbackText.trim()) { showToastMsg("Please describe your feedback", "error"); return; }
                setScreen("submitting");
                fetch(API_BASE + "/reports", {
                  method: "POST",
                  headers: authHeaders(),
                  body: JSON.stringify({ type: feedbackType, text: feedbackText.trim() }),
                }).then(function (res) {
                  if (res.status === 401 || res.status === 403) throw new Error("Invalid token — check Settings");
                  if (!res.ok) throw new Error("HTTP " + res.status);
                  return res.json();
                }).then(function (report) {
                  if (feedbackImage) {
                    return uploadAttachment(report.id, feedbackImage).then(function (res) {
                      if (!res.ok) showToastMsg("Feedback sent but image upload failed", "error");
                      else showToastMsg("Feedback sent", "success");
                    });
                  }
                  showToastMsg("Feedback sent", "success");
                }).then(function () {
                  setFeedbackText("");
                  setFeedbackImage(null);
                  setScreen("feedback");
                }).catch(function (err) {
                  if (err instanceof TypeError) { addToQueueFn("feedback", { type: feedbackType, text: feedbackText.trim() }); showToastMsg("Feedback saved offline (image not queued)", "success"); setFeedbackText(""); setFeedbackImage(null); return; }
                  showToastMsg(err.message || "Error", "error");
                  setScreen("feedback");
                });
              }}><Text style={st.btnSubmitText}>Send</Text></TouchableOpacity>
            </View>
            <TouchableOpacity style={{ marginTop: 20 }} onPress={function () {
              if (feedbackShowList) { setFeedbackShowList(false); return; }
              fetch(API_BASE + "/reports", { headers: authHeaders() })
                .then(function (res) { if (!res.ok) throw new Error("HTTP " + res.status); return res.json(); })
                .then(function (data) { setFeedbackList(data); setFeedbackShowList(true); })
                .catch(function (err) { showToastMsg(err.message || "Load failed", "error"); });
            }}><Text style={{ color: C.muted, fontSize: 13 }}>{feedbackShowList ? "Hide History" : "View All Feedback"}</Text></TouchableOpacity>
            {feedbackShowList && feedbackList.map(function (fb) {
              return <View key={fb.id} style={[st.reviewItem, { marginTop: 8 }]}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", width: "100%" }}>
                  <Text style={{ color: fb.type === "bug" ? C.error : C.accent, fontSize: 12, textTransform: "uppercase" }}>{fb.type}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={{ color: C.muted, fontSize: 12 }}>{fb.created_at.slice(0, 10)}</Text>
                    <TouchableOpacity onPress={function () {
                      fetch(API_BASE + "/reports/" + fb.id, { method: "DELETE", headers: authHeaders() })
                        .then(function (res) { if (!res.ok) throw new Error("HTTP " + res.status); setFeedbackList(feedbackList.filter(function (f) { return f.id !== fb.id; })); showToastMsg("Deleted", "success"); })
                        .catch(function (err) { showToastMsg(err.message, "error"); });
                    }}><Text style={{ color: C.error, fontSize: 12 }}>Delete</Text></TouchableOpacity>
                  </View>
                </View>
                <Text style={{ color: C.text, fontSize: 14, marginTop: 4 }}>{fb.text}</Text>
                {fb.attachment && (
                  <Image source={{ uri: API_BASE + "/attachments/" + fb.attachment }} style={{ width: "100%", height: 150, borderRadius: C.radius, marginTop: 8 }} resizeMode="cover" />
                )}
              </View>;
            })}
          </ScrollView>
        </KeyboardAvoidingView>
        {renderToast()}
      </SafeAreaView>
    );
  }

  return <SafeAreaView style={st.container}><Text style={st.label}>Unknown screen</Text><TouchableOpacity style={st.btnBack} onPress={function () { setScreen("idle"); }}><Text style={st.btnBackText}>Home</Text></TouchableOpacity></SafeAreaView>;
}

