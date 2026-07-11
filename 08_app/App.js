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
  Switch,
  useColorScheme,
} from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import * as SystemUI from "expo-system-ui";
import * as ImagePicker from "expo-image-picker";
var DateTimePicker = Platform.OS === "web" ? null : require("@react-native-community/datetimepicker").default;

const API_BASE = process.env.EXPO_PUBLIC_API_BASE || "https://huxa.is";
const APP_VERSION = "0.3.2";

const COLOR_PROFILES = {
  dark: {
    name: "Dark",
    bg: "#101c30",
    surface: "#182848",
    input: "#203660",
    text: "#c8dce8",
    muted: "#6890b0",
    accent: "#c85060",
    success: "#58c8d8",
    error: "#d04848",
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
    categoryManageRow: { flexDirection: "row", alignItems: "center", backgroundColor: C.surface, borderRadius: 15, padding: 12, width: "100%", marginBottom: 8, gap: 10 },
    categoryManageLabel: { flex: 1, color: C.text, fontSize: 14, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1 },
    categoryManageLabelOff: { color: C.muted },
    categoryMoveBtn: { paddingHorizontal: 8, paddingVertical: 4 },
    categoryMoveBtnText: { color: C.muted, fontSize: 16 },
    fieldCountText: { color: C.muted, fontSize: 11, marginTop: 2 },
    fieldTypePill: { flex: 1, backgroundColor: C.surface, borderRadius: 25, paddingVertical: 8, alignItems: "center" },
    fieldTypePillActive: { backgroundColor: C.accent },
    fieldTypePillText: { color: C.muted, fontSize: 12, fontWeight: "600" },
    fieldTypePillTextActive: { color: C.text },
    composeFieldBlock: { width: "100%", marginBottom: 12 },
    metricLine: { color: C.muted, fontSize: 12, marginTop: 2 },
    manageLink: { marginTop: 20 },
    manageLinkText: { color: C.muted, fontSize: 13 },
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
    confirmOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", padding: 20 },
    confirmBox: { backgroundColor: C.surface, borderRadius: 15, padding: 20, width: "100%", maxWidth: 340 },
    confirmTitle: { color: C.text, fontSize: 16, fontWeight: "600", marginBottom: 8 },
    confirmMessage: { color: C.muted, fontSize: 14, lineHeight: 20, marginBottom: 20 },
    confirmRow: { flexDirection: "row", gap: 12 },
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
const FIELD_TYPES = [
  { key: "scale", label: "1–10" },
  { key: "number", label: "Number" },
  { key: "boolean", label: "Yes/No" },
  { key: "text", label: "Text" },
];

function fieldTypeLabel(type) {
  var t = FIELD_TYPES.find(function (x) { return x.key === type; });
  return t ? t.label : type;
}

function slugifyKey(label) {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

const DEFAULT_CATEGORIES = [
  { key: "Event", label: "Event", enabled: true },
  { key: "Intervention", label: "Intervention", enabled: true },
  { key: "Symptom", label: "Symptom", enabled: true },
  { key: "Decision", label: "Decision", enabled: true },
  { key: "Thought", label: "Thought", enabled: true },
];

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

export default function App() {
  return <SafeAreaProvider><AppContent /></SafeAreaProvider>;
}

function AppContent() {
  var _a = useState("idle"), screen = _a[0], setScreen = _a[1];
  var _b = useState(""), token = _b[0], setToken = _b[1];
  var _c = useState(""), tokenInput = _c[0], setTokenInput = _c[1];
  var _d = useState(null), toast = _d[0], setToast = _d[1];
  var _cd = useState(null), confirmDialog = _cd[0], setConfirmDialog = _cd[1];

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

  var _cat1 = useState(DEFAULT_CATEGORIES), categories = _cat1[0], setCategories = _cat1[1];
  var _cat2 = useState(""), newCategoryName = _cat2[0], setNewCategoryName = _cat2[1];
  var _cat3 = useState(null), editingCategoryKey = _cat3[0], setEditingCategoryKey = _cat3[1];
  var _cat4 = useState(""), newFieldLabel = _cat4[0], setNewFieldLabel = _cat4[1];
  var _cat5 = useState("scale"), newFieldType = _cat5[0], setNewFieldType = _cat5[1];
  var _cm = useState({}), composeMetrics = _cm[0], setComposeMetrics = _cm[1];

  var _cp = useState(DEFAULT_PROFILE), colorProfile = _cp[0], setColorProfile = _cp[1];
  var osScheme = useColorScheme();
  var C = useMemo(function () { return getColors(colorProfile, osScheme); }, [colorProfile, osScheme]);
  var st = useMemo(function () { return makeStyles(C); }, [C]);

  useEffect(function () {
    var envToken = process.env.EXPO_PUBLIC_AUTH_TOKEN;
    if (envToken) { setToken(envToken); }
    else { AsyncStorage.getItem("huxa_token").then(function (t) { if (t) setToken(t); }); }
    AsyncStorage.getItem("huxa_color_profile").then(function (p) { if (p && COLOR_PROFILES[p]) setColorProfile(p); });
    AsyncStorage.getItem("huxa_categories").then(function (val) {
      try { var c = JSON.parse(val); if (Array.isArray(c) && c.length > 0) setCategories(c); } catch (e) {}
    });
    loadQueue();
  }, []);

  useEffect(function () {
    if (!token) return;
    fetch(API_BASE + "/categories", { headers: authHeaders() })
      .then(function (res) { if (!res.ok) throw new Error("HTTP " + res.status); return res.json(); })
      .then(function (data) {
        if (Array.isArray(data) && data.length > 0) {
          setCategories(data);
          AsyncStorage.setItem("huxa_categories", JSON.stringify(data));
        }
      })
      .catch(function () {}); // offline or error: keep cached/default categories
  }, [token]);

  useEffect(function () {
    SystemUI.setBackgroundColorAsync(C.bg);
  }, [C.bg]);

  function showToastMsg(msg, type) {
    setToast({ msg: msg, type: type });
    setTimeout(function () { setToast(null); }, 3000);
  }

  function confirmAction(title, message, onConfirm) {
    if (Platform.OS === "web") {
      // window.confirm doesn't work in the Tauri desktop webview, so use an in-app modal instead.
      setConfirmDialog({ title: title, message: message, onConfirm: onConfirm });
    } else {
      Alert.alert(title, message, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: onConfirm },
      ]);
    }
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

  var enabledCategories = categories.filter(function (c) { return c.enabled; });

  function saveCategories(updated) {
    setCategories(updated);
    AsyncStorage.setItem("huxa_categories", JSON.stringify(updated));
    fetch(API_BASE + "/categories", { method: "PUT", headers: authHeaders(), body: JSON.stringify(updated) })
      .then(function (res) { if (!res.ok) return res.json().catch(function () { return {}; }).then(function (b) { throw new Error(b.detail || "HTTP " + res.status); }); })
      .catch(function (err) {
        if (err instanceof TypeError) { showToastMsg("Offline: will sync on next change", "error"); return; }
        showToastMsg(err.message || "Save failed", "error");
      });
  }

  function addCategory() {
    var name = newCategoryName.trim();
    if (!name) return;
    var exists = categories.some(function (c) { return c.key.toLowerCase() === name.toLowerCase(); });
    if (exists) { showToastMsg("Category already exists", "error"); return; }
    saveCategories(categories.concat([{ key: name, label: name, enabled: true }]));
    setNewCategoryName("");
  }

  function toggleCategory(key) {
    saveCategories(categories.map(function (c) {
      return c.key === key ? { key: c.key, label: c.label, enabled: !c.enabled } : c;
    }));
  }

  function deleteCategory(key) {
    confirmAction("Delete Category", 'Delete "' + key + '"? Events already logged with it keep their type.', function () {
      saveCategories(categories.filter(function (c) { return c.key !== key; }));
    });
  }

  function moveCategoryUp(index) {
    if (index === 0) return;
    var updated = categories.slice();
    var tmp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = tmp;
    saveCategories(updated);
  }

  function updateCategoryFields(catKey, newFields) {
    saveCategories(categories.map(function (c) {
      return c.key === catKey ? Object.assign({}, c, { fields: newFields }) : c;
    }));
  }

  function addFieldToCategory() {
    var label = newFieldLabel.trim();
    if (!label) return;
    var key = slugifyKey(label);
    if (!key) { showToastMsg("Invalid field name", "error"); return; }
    var cat = categories.find(function (c) { return c.key === editingCategoryKey; });
    if (!cat) return;
    var fields = cat.fields || [];
    if (fields.some(function (f) { return f.key === key; })) { showToastMsg("Field already exists", "error"); return; }
    updateCategoryFields(editingCategoryKey, fields.concat([{ key: key, label: label, type: newFieldType }]));
    setNewFieldLabel("");
  }

  function deleteField(fieldKey) {
    var cat = categories.find(function (c) { return c.key === editingCategoryKey; });
    if (!cat) return;
    confirmAction("Delete Field", "Delete this field? Values already logged stay in their events.", function () {
      updateCategoryFields(editingCategoryKey, (cat.fields || []).filter(function (f) { return f.key !== fieldKey; }));
    });
  }

  function moveFieldUp(index) {
    if (index === 0) return;
    var cat = categories.find(function (c) { return c.key === editingCategoryKey; });
    if (!cat) return;
    var updated = (cat.fields || []).slice();
    var tmp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = tmp;
    updateCategoryFields(editingCategoryKey, updated);
  }

  function setComposeMetric(key, value) {
    var updated = Object.assign({}, composeMetrics);
    if (value === undefined) delete updated[key];
    else updated[key] = value;
    setComposeMetrics(updated);
  }

  function buildMetrics() {
    var cat = categories.find(function (c) { return c.key === selectedType; });
    var fields = (cat && cat.fields) || [];
    var m = {};
    fields.forEach(function (f) {
      var v = composeMetrics[f.key];
      if (v === undefined || v === null || v === "") return;
      if (f.type === "number") {
        var n = parseFloat(String(v).replace(",", "."));
        if (!isNaN(n)) m[f.key] = n;
        return;
      }
      if (f.type === "text") {
        var t = String(v).trim();
        if (t) m[f.key] = t;
        return;
      }
      m[f.key] = v;
    });
    return m;
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
    var metrics = buildMetrics();
    if (!text && Object.keys(metrics).length === 0) { showToastMsg("Add text or fill in a field", "error"); return; }
    if (!token) { setScreen("token"); return; }

    var isEditing = !!editingEventId;
    var eventId = isEditing ? editingEventId : generateUUID();
    var clientTs = composeDate.toISOString().replace(/\.\d{3}Z$/, "Z");
    var event = { id: eventId, client_timestamp: clientTs, type: selectedType, text: text, metrics: metrics, meta: { version: 1 } };

    setScreen("submitting");
    var url = isEditing ? API_BASE + "/events/" + eventId : API_BASE + "/events";
    fetch(url, { method: isEditing ? "PUT" : "POST", headers: authHeaders(), body: JSON.stringify(event) })
      .then(function (res) {
        if (!res.ok) return res.json().catch(function () { return {}; }).then(function (body) { throw new Error(body.detail || "HTTP " + res.status); });
        setEditingEventId(null);
        if (nextType) {
          showToastMsg("Logged", "success");
          setSelectedType(nextType); setComposeText(""); setComposeMetrics({}); setComposeDate(new Date()); setScreen("compose");
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
    var cat = categories.find(function (c) { return c.key === ev.type; });
    var m = ev.metrics || {};
    var stateMetrics = {};
    ((cat && cat.fields) || []).forEach(function (f) {
      if (m[f.key] === undefined) return;
      stateMetrics[f.key] = f.type === "number" ? String(m[f.key]) : m[f.key];
    });
    setComposeMetrics(stateMetrics);
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

  function renderConfirm() {
    if (!confirmDialog) return null;
    return (
      <View style={st.confirmOverlay}>
        <View style={st.confirmBox}>
          <Text style={st.confirmTitle}>{confirmDialog.title}</Text>
          <Text style={st.confirmMessage}>{confirmDialog.message}</Text>
          <View style={st.confirmRow}>
            <TouchableOpacity style={st.btnBack} onPress={function () { setConfirmDialog(null); }}><Text style={st.btnBackText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={[st.btnSubmit, { backgroundColor: C.error }]} onPress={function () { var onConfirm = confirmDialog.onConfirm; setConfirmDialog(null); onConfirm(); }}><Text style={st.btnSubmitText}>Delete</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    );
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
        {renderConfirm()}
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
        {renderConfirm()}
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
                      <View style={[st.profileSwatch, { backgroundColor: COLOR_PROFILES.dark.bg, borderColor: prof.muted, width: 12, height: 24, borderRadius: 0, borderTopLeftRadius: 12, borderBottomLeftRadius: 12, marginBottom: 0 }]} />
                      <View style={[st.profileSwatch, { backgroundColor: COLOR_PROFILES.light.bg, borderColor: prof.muted, width: 12, height: 24, borderRadius: 0, borderTopRightRadius: 12, borderBottomRightRadius: 12, marginBottom: 0, borderLeftWidth: 0 }]} />
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
          {enabledCategories.map(function (cat) {
            return <TouchableOpacity key={cat.key} style={st.categoryBtn} onPress={function () { setEditingEventId(null); setSelectedType(cat.key); setComposeText(""); setComposeMetrics({}); setComposeDate(new Date()); setScreen("compose"); }}><Text style={st.categoryBtnText}>{cat.label}</Text></TouchableOpacity>;
          })}
        </View>
        <TouchableOpacity style={st.manageLink} onPress={function () { setNewCategoryName(""); setScreen("categories-manage"); }}><Text style={st.manageLinkText}>Manage Categories</Text></TouchableOpacity>
        <View style={{ height: 12 }} />
        <View style={st.halfRow}><TouchableOpacity style={st.btnBack} onPress={function () { setScreen("idle"); }}><Text style={st.btnBackText}>Back</Text></TouchableOpacity></View>
      </SafeAreaView>
    );
  }

  // --- MANAGE CATEGORIES ---
  if (screen === "categories-manage") {
    return (
      <SafeAreaView style={st.container}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, width: "100%" }}>
          <TouchableOpacity onPress={function () { setScreen("idle"); }} onLongPress={function () { setFeedbackPrevScreen(screen); setFeedbackType("feature"); setFeedbackText(""); setFeedbackImage(null); setScreen("feedback"); }}><Text style={st.title}>HuXa</Text></TouchableOpacity>
          <Text style={st.label}>Manage Categories</Text>
          <ScrollView style={st.historyScroll} contentContainerStyle={st.historyScrollContent} keyboardShouldPersistTaps="handled">
            {categories.map(function (cat, index) {
              return (
                <View key={cat.key} style={st.categoryManageRow}>
                  <TouchableOpacity style={st.categoryMoveBtn} onPress={function () { moveCategoryUp(index); }}><Text style={st.categoryMoveBtnText}>{"▲"}</Text></TouchableOpacity>
                  <TouchableOpacity style={{ flex: 1 }} onPress={function () { setEditingCategoryKey(cat.key); setNewFieldLabel(""); setNewFieldType("scale"); setScreen("category-fields"); }}>
                    <Text style={[st.categoryManageLabel, { flex: 0 }, !cat.enabled && st.categoryManageLabelOff]}>{cat.label}</Text>
                    <Text style={st.fieldCountText}>{(cat.fields || []).length + (((cat.fields || []).length === 1) ? " field ›" : " fields ›")}</Text>
                  </TouchableOpacity>
                  <Switch value={cat.enabled} onValueChange={function () { toggleCategory(cat.key); }} trackColor={{ false: C.input, true: C.accent }} thumbColor="#fff" />
                  <TouchableOpacity style={st.categoryMoveBtn} onPress={function () { deleteCategory(cat.key); }}><Text style={[st.categoryMoveBtnText, { color: C.error }]}>{"✕"}</Text></TouchableOpacity>
                </View>
              );
            })}
            <TextInput style={[st.input, { marginTop: 8 }]} placeholder="New category name" placeholderTextColor={C.muted} value={newCategoryName} onChangeText={setNewCategoryName} onSubmitEditing={addCategory} returnKeyType="done" />
            <TouchableOpacity style={[st.btnSubmit, { flex: 0 }]} onPress={addCategory}><Text style={st.btnSubmitText}>Add Category</Text></TouchableOpacity>
          </ScrollView>
          <View style={[st.halfRow, { marginBottom: 20 }]}><TouchableOpacity style={st.btnBack} onPress={function () { setScreen("category"); }}><Text style={st.btnBackText}>Back</Text></TouchableOpacity></View>
        </KeyboardAvoidingView>
        {renderToast()}
        {renderConfirm()}
      </SafeAreaView>
    );
  }

  // --- CATEGORY FIELDS ---
  if (screen === "category-fields") {
    var editingCat = categories.find(function (c) { return c.key === editingCategoryKey; });
    var catFields = (editingCat && editingCat.fields) || [];
    return (
      <SafeAreaView style={st.container}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, width: "100%" }}>
          <TouchableOpacity onPress={function () { setScreen("idle"); }} onLongPress={function () { setFeedbackPrevScreen(screen); setFeedbackType("feature"); setFeedbackText(""); setFeedbackImage(null); setScreen("feedback"); }}><Text style={st.title}>HuXa</Text></TouchableOpacity>
          <Text style={st.label}>{(editingCat ? editingCat.label : "?") + " Fields"}</Text>
          <ScrollView style={st.historyScroll} contentContainerStyle={st.historyScrollContent} keyboardShouldPersistTaps="handled">
            {catFields.map(function (f, index) {
              return (
                <View key={f.key} style={st.categoryManageRow}>
                  <TouchableOpacity style={st.categoryMoveBtn} onPress={function () { moveFieldUp(index); }}><Text style={st.categoryMoveBtnText}>{"▲"}</Text></TouchableOpacity>
                  <View style={{ flex: 1 }}>
                    <Text style={[st.categoryManageLabel, { flex: 0 }]}>{f.label}</Text>
                    <Text style={st.fieldCountText}>{fieldTypeLabel(f.type)}</Text>
                  </View>
                  <TouchableOpacity style={st.categoryMoveBtn} onPress={function () { deleteField(f.key); }}><Text style={[st.categoryMoveBtnText, { color: C.error }]}>{"✕"}</Text></TouchableOpacity>
                </View>
              );
            })}
            {catFields.length === 0 && <Text style={[st.emptyText, { marginBottom: 12 }]}>No fields yet. Fields show up as inputs when logging this category, and their values are stored as metrics on the event.</Text>}
            <TextInput style={[st.input, { marginTop: 8 }]} placeholder="New field name" placeholderTextColor={C.muted} value={newFieldLabel} onChangeText={setNewFieldLabel} onSubmitEditing={addFieldToCategory} returnKeyType="done" />
            <View style={{ flexDirection: "row", gap: 8, width: "100%", marginBottom: 12 }}>
              {FIELD_TYPES.map(function (t) {
                var active = newFieldType === t.key;
                return <TouchableOpacity key={t.key} style={[st.fieldTypePill, active && st.fieldTypePillActive]} onPress={function () { setNewFieldType(t.key); }}><Text style={[st.fieldTypePillText, active && st.fieldTypePillTextActive]}>{t.label}</Text></TouchableOpacity>;
              })}
            </View>
            <TouchableOpacity style={[st.btnSubmit, { flex: 0 }]} onPress={addFieldToCategory}><Text style={st.btnSubmitText}>Add Field</Text></TouchableOpacity>
          </ScrollView>
          <View style={[st.halfRow, { marginBottom: 20 }]}><TouchableOpacity style={st.btnBack} onPress={function () { setScreen("categories-manage"); }}><Text style={st.btnBackText}>Back</Text></TouchableOpacity></View>
        </KeyboardAvoidingView>
        {renderToast()}
        {renderConfirm()}
      </SafeAreaView>
    );
  }

  // --- COMPOSE ---
  if (screen === "compose") {
    var composeCat = categories.find(function (c) { return c.key === selectedType; });
    var composeFields = (composeCat && composeCat.fields) || [];
    var renderComposeField = function (f) {
      if (f.type === "scale") {
        var cur = composeMetrics[f.key];
        var rows = [];
        for (var r = 1; r <= 10; r += 5) {
          rows.push(
            <View key={r} style={st.scaleRow}>
              {[0, 1, 2, 3, 4].map(function (i) {
                var val = r + i;
                return (
                  <TouchableOpacity key={val} style={[st.scaleBtn, cur === val && st.scaleBtnSelected]} onPress={function () { setComposeMetric(f.key, cur === val ? undefined : val); }}>
                    <Text style={[st.scaleBtnText, cur === val && st.scaleBtnTextSelected]}>{val}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        }
        return <View key={f.key} style={st.composeFieldBlock}><Text style={st.labelSmall}>{f.label}</Text><View style={st.scaleGrid}>{rows}</View></View>;
      }
      if (f.type === "boolean") {
        var bv = composeMetrics[f.key];
        return (
          <View key={f.key} style={st.composeFieldBlock}>
            <Text style={st.labelSmall}>{f.label}</Text>
            <View style={st.scaleRow}>
              <TouchableOpacity style={[st.scaleBtn, bv === true && st.scaleBtnSelected]} onPress={function () { setComposeMetric(f.key, bv === true ? undefined : true); }}><Text style={[st.scaleBtnText, bv === true && st.scaleBtnTextSelected]}>Yes</Text></TouchableOpacity>
              <TouchableOpacity style={[st.scaleBtn, bv === false && st.scaleBtnSelected]} onPress={function () { setComposeMetric(f.key, bv === false ? undefined : false); }}><Text style={[st.scaleBtnText, bv === false && st.scaleBtnTextSelected]}>No</Text></TouchableOpacity>
            </View>
          </View>
        );
      }
      if (f.type === "number") {
        return <View key={f.key} style={st.composeFieldBlock}><Text style={st.labelSmall}>{f.label}</Text><TextInput style={[st.input, { marginBottom: 0 }]} placeholder="0" placeholderTextColor={C.muted} value={composeMetrics[f.key] !== undefined ? String(composeMetrics[f.key]) : ""} onChangeText={function (t) { setComposeMetric(f.key, t); }} keyboardType="decimal-pad" /></View>;
      }
      return <View key={f.key} style={st.composeFieldBlock}><Text style={st.labelSmall}>{f.label}</Text><TextInput style={[st.input, { marginBottom: 0 }]} placeholder="..." placeholderTextColor={C.muted} value={composeMetrics[f.key] || ""} onChangeText={function (t) { setComposeMetric(f.key, t); }} /></View>;
    };
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
            {composeFields.map(renderComposeField)}
            <TextInput style={[st.input, st.textArea]} placeholder={composeFields.length > 0 ? "Any comments?" : "What happened?"} placeholderTextColor={C.muted} value={composeText} onChangeText={setComposeText} multiline numberOfLines={3} />
            <View style={st.row}>
              <TouchableOpacity style={st.btnBack} onPress={function () { if (editingEventId) { setEditingEventId(null); setScreen("history"); doFetchHistory(historyTab, historyDate); } else setScreen("category"); }}><Text style={st.btnBackText}>Back</Text></TouchableOpacity>
              <TouchableOpacity style={st.btnSubmit} onPress={function () { submitEvent(null); }}><Text style={st.btnSubmitText}>Submit</Text></TouchableOpacity>
            </View>
            {!editingEventId && (
              <View style={st.submitNewSection}>
                <Text style={st.labelSmall}>Submit & log another</Text>
                <View style={st.categoryGrid}>
                  {enabledCategories.map(function (cat) { return <TouchableOpacity key={cat.key} style={st.categoryBtn} onPress={function () { submitEvent(cat.key); }}><Text style={st.categoryBtnText}>{cat.label}</Text></TouchableOpacity>; })}
                </View>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
        {renderToast()}
        {renderConfirm()}
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
                  {ev.text !== "" && <Text style={st.eventText}>{ev.text}</Text>}
                  {ev.metrics && Object.keys(ev.metrics).length > 0 && (
                    <View style={{ marginTop: 2 }}>
                      {Object.keys(ev.metrics).map(function (k) {
                        var v = ev.metrics[k];
                        var disp = v === true ? "Yes" : v === false ? "No" : String(v);
                        var evCat = categories.find(function (c) { return c.key === ev.type; });
                        var fld = evCat && (evCat.fields || []).find(function (fl) { return fl.key === k; });
                        return <Text key={k} style={st.metricLine}>{(fld ? fld.label : k) + ": " + disp}</Text>;
                      })}
                    </View>
                  )}
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
        {renderConfirm()}
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
        {renderConfirm()}
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
        {renderConfirm()}
      </SafeAreaView>
    );
  }

  return <SafeAreaView style={st.container}><Text style={st.label}>Unknown screen</Text><TouchableOpacity style={st.btnBack} onPress={function () { setScreen("idle"); }}><Text style={st.btnBackText}>Home</Text></TouchableOpacity></SafeAreaView>;
}

