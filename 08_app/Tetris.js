import React, { useState, useEffect, useRef, useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform, PanResponder, useWindowDimensions } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const COLS = 10;
const ROWS = 20;
const LINE_SCORES = [0, 40, 100, 300, 1200];
const SLOP = 10;
const SWIPE_DISTANCE = 30;
const LONG_DISTANCE = 90;
const DROP_DISTANCE = 120;
const MOVE_REPEAT = 80;

const PIECES = {
  I: { color: "#48c8e8", cells: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]] },
  O: { color: "#f0c850", cells: [[1, 1], [1, 1]] },
  T: { color: "#b070e8", cells: [[0, 1, 0], [1, 1, 1], [0, 0, 0]] },
  S: { color: "#60c870", cells: [[0, 1, 1], [1, 1, 0], [0, 0, 0]] },
  Z: { color: "#e86060", cells: [[1, 1, 0], [0, 1, 1], [0, 0, 0]] },
  J: { color: "#5880e8", cells: [[1, 0, 0], [1, 1, 1], [0, 0, 0]] },
  L: { color: "#f09040", cells: [[0, 0, 1], [1, 1, 1], [0, 0, 0]] },
};
const PIECE_KEYS = Object.keys(PIECES);

function emptyBoard() {
  var board = [];
  for (var r = 0; r < ROWS; r++) board.push(new Array(COLS).fill(null));
  return board;
}

function shuffledBag() {
  var bag = PIECE_KEYS.slice();
  for (var i = bag.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = bag[i]; bag[i] = bag[j]; bag[j] = t;
  }
  return bag;
}

function draw(bag) {
  var b = bag.length ? bag.slice() : shuffledBag();
  return { key: b.pop(), bag: b };
}

function spawn(key) {
  var cells = PIECES[key].cells;
  var top = 0;
  while (!cells[top].some(function (x) { return x; })) top++;
  return { key: key, cells: cells, row: -top, col: Math.floor((COLS - cells.length) / 2) };
}

function collides(board, cells, row, col) {
  for (var r = 0; r < cells.length; r++) {
    for (var c = 0; c < cells[r].length; c++) {
      if (!cells[r][c]) continue;
      var br = row + r, bc = col + c;
      if (bc < 0 || bc >= COLS || br >= ROWS) return true;
      if (br >= 0 && board[br][bc]) return true;
    }
  }
  return false;
}

function rotateCells(cells, dir) {
  var n = cells.length;
  var out = [];
  for (var r = 0; r < n; r++) {
    out.push([]);
    for (var c = 0; c < n; c++) out[r].push(dir > 0 ? cells[n - 1 - c][r] : cells[c][n - 1 - r]);
  }
  return out;
}

function landingRow(board, piece) {
  var row = piece.row;
  while (!collides(board, piece.cells, row + 1, piece.col)) row++;
  return row;
}

function newGame() {
  var first = draw([]);
  var second = draw(first.bag);
  return { board: emptyBoard(), piece: spawn(first.key), next: second.key, bag: second.bag, held: null, holdUsed: false, score: 0, lines: 0, level: 0, over: false, paused: false };
}

function active(g) { return !!g && !g.over && !g.paused; }

function withPiece(g, piece) { return Object.assign({}, g, { piece: piece }); }

function shifted(g, dr, dc) {
  var p = g.piece;
  if (collides(g.board, p.cells, p.row + dr, p.col + dc)) return null;
  return withPiece(g, Object.assign({}, p, { row: p.row + dr, col: p.col + dc }));
}

function lock(g) {
  var board = g.board.map(function (row) { return row.slice(); });
  var p = g.piece;
  var over = false;
  for (var r = 0; r < p.cells.length; r++) {
    for (var c = 0; c < p.cells[r].length; c++) {
      if (!p.cells[r][c]) continue;
      if (p.row + r < 0) { over = true; continue; }
      board[p.row + r][p.col + c] = p.key;
    }
  }
  var kept = board.filter(function (row) { return row.some(function (cell) { return !cell; }); });
  var cleared = ROWS - kept.length;
  while (kept.length < ROWS) kept.unshift(new Array(COLS).fill(null));
  var lines = g.lines + cleared;
  var next = draw(g.bag);
  var piece = spawn(g.next);
  if (collides(kept, piece.cells, piece.row, piece.col)) over = true;
  return Object.assign({}, g, {
    board: kept,
    piece: piece,
    next: next.key,
    bag: next.bag,
    score: g.score + LINE_SCORES[cleared] * (g.level + 1),
    lines: lines,
    level: Math.floor(lines / 10),
    holdUsed: false,
    over: over,
  });
}

// store the falling piece and bring in the stored one (or the next piece when the box is empty); once per piece
function holdPiece(g) {
  if (!active(g) || g.holdUsed) return g;
  var piece, next = g.next, bag = g.bag;
  if (g.held === null) {
    var d = draw(g.bag);
    piece = spawn(g.next); next = d.key; bag = d.bag;
  } else {
    piece = spawn(g.held);
  }
  return Object.assign({}, g, { piece: piece, held: g.piece.key, next: next, bag: bag, holdUsed: true, over: collides(g.board, piece.cells, piece.row, piece.col) });
}

function moveLeft(g) { return active(g) ? shifted(g, 0, -1) || g : g; }
function moveRight(g) { return active(g) ? shifted(g, 0, 1) || g : g; }
function tick(g) { return active(g) ? shifted(g, 1, 0) || lock(g) : g; }

function rotate(g, dir) {
  if (!active(g)) return g;
  var cells = rotateCells(g.piece.cells, dir);
  var kicks = [0, -1, 1, -2, 2];
  for (var i = 0; i < kicks.length; i++) {
    var col = g.piece.col + kicks[i];
    if (!collides(g.board, cells, g.piece.row, col)) return withPiece(g, Object.assign({}, g.piece, { cells: cells, col: col }));
  }
  return g;
}
function rotateCW(g) { return rotate(g, 1); }
function rotateCCW(g) { return rotate(g, -1); }

function softDrop(g) {
  if (!active(g)) return g;
  var moved = shifted(g, 1, 0);
  if (!moved) return lock(g);
  moved.score += 1;
  return moved;
}

function hardDrop(g) {
  if (!active(g)) return g;
  var row = landingRow(g.board, g.piece);
  var dropped = withPiece(g, Object.assign({}, g.piece, { row: row }));
  dropped.score += (row - g.piece.row) * 2;
  return lock(dropped);
}

function togglePause(g) { return g && !g.over ? Object.assign({}, g, { paused: !g.paused }) : g; }
function startOrResume(g) { return active(g) ? g : g && g.paused ? togglePause(g) : newGame(); }
function dropInterval(level) { return Math.max(100, 800 - level * 70); }

export default function Tetris(props) {
  var C = props.colors;
  var st = props.styles;
  var _g = useState(null), game = _g[0], setGame = _g[1];
  var _b = useState(0), best = _b[0], setBest = _b[1];
  var dims = useWindowDimensions();

  var cell = Math.max(10, Math.min(36, Math.floor((dims.width - 40) / COLS), Math.floor((dims.height - 240) / ROWS)));
  var mini = Math.max(5, Math.floor(cell * 0.4));
  var cellRef = useRef(cell);
  cellRef.current = cell;

  var s = useMemo(function () {
    return StyleSheet.create({
      root: Object.assign({ flex: 1, width: "100%", alignItems: "center" }, Platform.OS === "web" ? { touchAction: "none", userSelect: "none" } : {}),
      stats: { flexDirection: "row", width: "100%", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 10 },
      statLabel: { color: C.muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 1 },
      statValue: { color: C.text, fontSize: 16, fontWeight: "600", marginTop: 2 },
      preview: { width: mini * 4, height: mini * 4, marginTop: 2, justifyContent: "center" },
      pauseBtn: { borderRadius: 25, borderWidth: 1, borderColor: C.muted, paddingVertical: 6, paddingHorizontal: 14 },
      pauseText: { color: C.muted, fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1 },
      board: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.muted, borderRadius: 4, overflow: "hidden" },
      boardRow: { flexDirection: "row" },
      cellEmpty: { borderWidth: 1, borderColor: C.input },
      cellFull: { borderWidth: 1, borderColor: "rgba(0,0,0,0.3)" },
      cellGhost: { borderWidth: 2 },
      overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.55)", padding: 16 },
      overlayTitle: { color: "#fff", fontSize: 22, fontWeight: "600", letterSpacing: 2, textTransform: "uppercase", textAlign: "center" },
      overlayText: { color: "#fff", fontSize: 13, marginTop: 12, textAlign: "center", lineHeight: 20 },
    });
  }, [C, mini]);

  useEffect(function () {
    AsyncStorage.getItem("huxa_tetris_best").then(function (v) { var n = parseInt(v, 10); if (n > 0) setBest(n); });
  }, []);

  var running = active(game);
  var level = game ? game.level : 0;
  useEffect(function () {
    if (!running) return;
    var id = setInterval(function () { setGame(tick); }, dropInterval(level));
    return function () { clearInterval(id); };
  }, [running, level]);

  var over = !!game && game.over;
  var score = game ? game.score : 0;
  useEffect(function () {
    if (over && score > best) {
      setBest(score);
      AsyncStorage.setItem("huxa_tetris_best", String(score));
    }
  }, [over, score, best]);

  useEffect(function () {
    if (Platform.OS !== "web") return;
    var keys = { ArrowLeft: moveLeft, ArrowRight: moveRight, ArrowDown: softDrop, ArrowUp: rotateCW, x: rotateCW, z: rotateCCW, c: holdPiece, Shift: holdPiece, " ": hardDrop, p: togglePause, Escape: togglePause, Enter: startOrResume };
    var repeatable = { ArrowLeft: true, ArrowRight: true, ArrowDown: true };
    function onKey(e) {
      var fn = keys[e.key];
      if (!fn) return;
      e.preventDefault();
      if (e.repeat && !repeatable[e.key]) return;
      setGame(fn);
    }
    window.addEventListener("keydown", onKey);
    return function () { window.removeEventListener("keydown", onKey); };
  }, []);

  // Whole-screen gestures. A swipe left or right moves one column, and keeps moving until the
  // finger lifts when it goes past LONG_DISTANCE. A short swipe up or down rotates once on
  // release (up clockwise, down counter-clockwise). A swipe up past LONG_DISTANCE stores or swaps
  // the piece, a swipe down past DROP_DISTANCE drops it. A tap starts or resumes.
  var gesture = useRef({ mode: null, fired: false, done: false, hold: null }).current;
  function stopHold() {
    if (gesture.hold === null) return;
    clearInterval(gesture.hold);
    gesture.hold = null;
  }
  useEffect(function () { return stopHold; }, []);
  var pan = useMemo(function () {
    return PanResponder.create({
      onStartShouldSetPanResponder: function () { return true; },
      onMoveShouldSetPanResponder: function () { return true; },
      onPanResponderGrant: function () {
        gesture.mode = null; gesture.fired = false; gesture.done = false;
        stopHold();
      },
      onPanResponderMove: function (e, gs) {
        if (gesture.done) return;
        if (gesture.mode === null) {
          if (Math.abs(gs.dx) < SLOP && Math.abs(gs.dy) < SLOP) return;
          gesture.mode = Math.abs(gs.dx) >= Math.abs(gs.dy) ? "h" : "v";
        }
        if (gesture.mode === "h") {
          if (Math.abs(gs.dx) < SWIPE_DISTANCE) return;
          var move = gs.dx > 0 ? moveRight : moveLeft;
          if (!gesture.fired) { gesture.fired = true; setGame(move); }
          if (Math.abs(gs.dx) >= LONG_DISTANCE && gesture.hold === null) gesture.hold = setInterval(function () { setGame(move); }, MOVE_REPEAT);
          return;
        }
        if (gs.dy >= DROP_DISTANCE) { gesture.done = true; setGame(hardDrop); }
        else if (gs.dy <= -LONG_DISTANCE) { gesture.done = true; setGame(holdPiece); }
      },
      onPanResponderRelease: function (e, gs) {
        stopHold();
        if (gesture.mode === null) { setGame(function (g) { return active(g) ? g : startOrResume(g); }); return; }
        if (gesture.mode === "v" && !gesture.done && Math.abs(gs.dy) >= SWIPE_DISTANCE) setGame(gs.dy < 0 ? rotateCW : rotateCCW);
      },
      onPanResponderTerminate: function () { stopHold(); },
    });
  }, []);

  var view = (game ? game.board : emptyBoard()).map(function (row) {
    return row.map(function (k) { return k ? { key: k, ghost: false } : null; });
  });
  if (game && !game.over) {
    var p = game.piece;
    var land = landingRow(game.board, p);
    for (var r = 0; r < p.cells.length; r++) {
      for (var c = 0; c < p.cells[r].length; c++) {
        if (!p.cells[r][c]) continue;
        if (land + r >= 0) view[land + r][p.col + c] = { key: p.key, ghost: true };
      }
    }
    for (r = 0; r < p.cells.length; r++) {
      for (c = 0; c < p.cells[r].length; c++) {
        if (p.cells[r][c] && p.row + r >= 0) view[p.row + r][p.col + c] = { key: p.key, ghost: false };
      }
    }
  }

  function cellStyle(entry, size) {
    var base = { width: size, height: size };
    if (!entry) return [s.cellEmpty, base];
    var color = PIECES[entry.key].color;
    if (entry.ghost) return [s.cellGhost, base, { borderColor: color, backgroundColor: color + "4d" }];
    return [s.cellFull, base, { backgroundColor: color }];
  }

  var overlayTitle = !game ? "Tetris" : game.over ? "Game over" : game.paused ? "Paused" : null;
  var overlayText = !game
    ? "Tap to start\n\nSwipe left or right to move\nA long swipe keeps moving until you lift\nSwipe up or down to rotate\nLong swipe up to store or swap the piece\nLong swipe down to drop"
    : game.over ? "Score " + game.score + ", " + game.lines + " lines\nTap to play again" : "Tap to resume";
  if (Platform.OS === "web" && !game) overlayText += "\n\nKeyboard: arrows, Z, X, C, space";
  var nextCells = game ? PIECES[game.next].cells : null;
  var heldCells = game && game.held ? PIECES[game.held].cells : null;

  return (
    <View style={s.root} {...pan.panHandlers}>
      <TouchableOpacity onPress={props.onExit}><Text style={st.title}>HuXa</Text></TouchableOpacity>
      <View style={s.stats}>
        <View style={game && game.holdUsed ? { opacity: 0.4 } : null}>
          <Text style={s.statLabel}>Hold</Text>
          <View style={s.preview}>
            {heldCells && heldCells.map(function (row, r) {
              return <View key={r} style={s.boardRow}>{row.map(function (x, c) { return <View key={c} style={cellStyle(x ? { key: game.held, ghost: false } : null, mini)} />; })}</View>;
            })}
          </View>
        </View>
        <View>
          <Text style={s.statLabel}>Next</Text>
          <View style={s.preview}>
            {nextCells && nextCells.map(function (row, r) {
              return <View key={r} style={s.boardRow}>{row.map(function (x, c) { return <View key={c} style={cellStyle(x ? { key: game.next, ghost: false } : null, mini)} />; })}</View>;
            })}
          </View>
        </View>
        <View><Text style={s.statLabel}>Score</Text><Text style={s.statValue}>{score}</Text></View>
        <View><Text style={s.statLabel}>Level</Text><Text style={s.statValue}>{level + 1}</Text></View>
        <View><Text style={s.statLabel}>Best</Text><Text style={s.statValue}>{best}</Text></View>
        <TouchableOpacity style={s.pauseBtn} onPress={function () { setGame(togglePause); }}>
          <Text style={s.pauseText}>{game && game.paused ? "Resume" : "Pause"}</Text>
        </TouchableOpacity>
      </View>
      <View>
        <View style={s.board}>
          {view.map(function (row, r) {
            return <View key={r} style={s.boardRow}>{row.map(function (entry, c) { return <View key={c + (entry ? (entry.ghost ? "g" : "f") : "e")} style={cellStyle(entry, cell)} />; })}</View>;
          })}
        </View>
        {overlayTitle && (
          <View style={s.overlay} pointerEvents="none">
            <Text style={s.overlayTitle}>{overlayTitle}</Text>
            <Text style={s.overlayText}>{overlayText}</Text>
          </View>
        )}
      </View>
    </View>
  );
}
