import React from "react";
import { View, Text, Linking, Platform } from "react-native";

// Renders the subset of Markdown that Ask HuXa answers use: headings, paragraphs,
// bullet and numbered lists (nested by indentation), bold, italic, inline code,
// links, fenced code, block quotes, rules and simple pipe tables.
// Anything else is shown as plain text, so an unexpected answer still reads.

var MONO = Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" });
var INLINE = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\)|\*[^*\s][^*]*\*)/;
var TABLE_SEP = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;

function renderInline(text, colors, size) {
  return text.split(INLINE).map(function (part, i) {
    if (!part) return null;
    if (part.length > 4 && part.slice(0, 2) === "**" && part.slice(-2) === "**") {
      return <Text key={i} style={{ fontWeight: "700" }}>{renderInline(part.slice(2, -2), colors, size)}</Text>;
    }
    if (part.length > 2 && part[0] === "`" && part.slice(-1) === "`") {
      return <Text key={i} style={{ fontFamily: MONO, fontSize: size - 1, backgroundColor: colors.input, borderRadius: 3 }}>{part.slice(1, -1)}</Text>;
    }
    var link = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (link) {
      return <Text key={i} style={{ color: colors.success, textDecorationLine: "underline" }} onPress={function () { Linking.openURL(link[2]); }}>{renderInline(link[1], colors, size)}</Text>;
    }
    if (part.length > 2 && part[0] === "*" && part.slice(-1) === "*") {
      return <Text key={i} style={{ fontStyle: "italic" }}>{renderInline(part.slice(1, -1), colors, size)}</Text>;
    }
    return part;
  });
}

function splitCells(line) {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map(function (c) { return c.trim(); });
}

function parseBlocks(text) {
  var lines = text.replace(/\r\n?/g, "\n").split("\n");
  var blocks = [];
  var para = [];
  function flush() {
    if (para.length) { blocks.push({ type: "p", text: para.join(" ") }); para = []; }
  }
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    var m;
    if (/^\s*```/.test(line)) {
      flush();
      var code = [];
      for (i++; i < lines.length && !/^\s*```/.test(lines[i]); i++) code.push(lines[i]);
      blocks.push({ type: "code", text: code.join("\n") });
      continue;
    }
    if (!line.trim()) { flush(); continue; }
    if ((m = line.match(/^(#{1,6})\s+(.*)$/))) {
      flush();
      blocks.push({ type: "h", level: m[1].length, text: m[2].replace(/\s+#+\s*$/, "") });
      continue;
    }
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) { flush(); blocks.push({ type: "hr" }); continue; }
    if ((m = line.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/))) {
      flush();
      var indent = m[1].replace(/\t/g, "  ").length;
      blocks.push({ type: "li", depth: Math.floor(indent / 2), marker: /\d/.test(m[2]) ? m[2] : null, text: m[3] });
      continue;
    }
    if ((m = line.match(/^\s*>\s?(.*)$/))) { flush(); blocks.push({ type: "quote", text: m[1] }); continue; }
    if (/^\s*\|.*\|\s*$/.test(line)) {
      flush();
      if (TABLE_SEP.test(line)) continue;
      var header = i + 1 < lines.length && TABLE_SEP.test(lines[i + 1]);
      blocks.push({ type: "tr", cells: splitCells(line), header: header });
      continue;
    }
    var last = blocks[blocks.length - 1];
    if (!para.length && last && last.type === "li" && /^\s/.test(line)) {
      last.text += " " + line.trim();
      continue;
    }
    para.push(line.trim());
  }
  flush();
  return blocks;
}

function gapBefore(prev, block) {
  if (!prev) return 0;
  if (prev.type === "li" && block.type === "li") return 4;
  if (prev.type === "tr" && block.type === "tr") return 0;
  if (prev.type === "h") return 6;
  if (block.type === "h") return block.level <= 2 ? 18 : 14;
  return 10;
}

export default function Markdown(props) {
  var colors = props.colors;
  var base = props.style || {};
  var size = base.fontSize || 14;
  var blocks = parseBlocks(props.text || "");
  return (
    <View>
      {blocks.map(function (b, i) {
        var top = { marginTop: gapBefore(blocks[i - 1], b) };
        if (b.type === "h") {
          var hs = b.level <= 2 ? size + 4 : size + 1;
          return <Text key={i} style={[base, top, { fontSize: hs, lineHeight: hs + 8, fontWeight: "700", letterSpacing: b.level <= 2 ? 0.3 : 0 }]}>{renderInline(b.text, colors, hs)}</Text>;
        }
        if (b.type === "li") {
          return (
            <View key={i} style={[top, { flexDirection: "row", paddingLeft: b.depth * 16 }]}>
              <Text style={[base, { minWidth: 18, paddingRight: 4 }]}>{b.marker || (b.depth ? "◦" : "•")}</Text>
              <Text style={[base, { flex: 1 }]}>{renderInline(b.text, colors, size)}</Text>
            </View>
          );
        }
        if (b.type === "code") {
          return (
            <View key={i} style={[top, { backgroundColor: colors.input, borderRadius: 6, padding: 8 }]}>
              <Text style={[base, { fontFamily: MONO, fontSize: size - 1 }]}>{b.text}</Text>
            </View>
          );
        }
        if (b.type === "quote") {
          return (
            <View key={i} style={[top, { borderLeftWidth: 3, borderLeftColor: colors.muted, paddingLeft: 10 }]}>
              <Text style={[base, { color: colors.muted }]}>{renderInline(b.text, colors, size)}</Text>
            </View>
          );
        }
        if (b.type === "hr") {
          return <View key={i} style={[top, { height: 1, backgroundColor: colors.muted, opacity: 0.5 }]} />;
        }
        if (b.type === "tr") {
          return (
            <View key={i} style={[top, { flexDirection: "row", paddingVertical: 4, borderBottomWidth: b.header ? 1 : 0, borderBottomColor: colors.muted }]}>
              {b.cells.map(function (c, j) {
                return <Text key={j} style={[base, { flex: 1, paddingRight: 6, fontWeight: b.header ? "700" : "400" }]}>{renderInline(c, colors, size)}</Text>;
              })}
            </View>
          );
        }
        return <Text key={i} style={[base, top]}>{renderInline(b.text, colors, size)}</Text>;
      })}
    </View>
  );
}
