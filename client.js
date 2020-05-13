const io = require("socket.io-client/dist/socket.io.js");
const path = require("path");
const host = `${location.hostname}:3009`;
const socket = io(host);
const unified = require("unified");
const markdownParser = require("remark-parse");
const md2html = require("remark-rehype");
const toHtmlStr = require("rehype-stringify");
const wikiLinkPlugin = require("remark-wiki-link");
const titlePlugin = require("remark-title");
const breaksPlugin = require("remark-breaks");

const { start, renderOnce } = require("@thi.ng/hdom");
const { serialize } = require("@thi.ng/hiccup");

const isMobile = window.innerWidth < 800;

const wikilinks = require("@kwvanderlinde/markdown-it-wikilinks")({
  // linkPattern: /\[\[([\w\s/!]+)(\|([\w\s/!]+))?\]\]/,
  linkPattern: /^\[\[(.+?)\]\]/,
  htmlAttributes: { class: "wikilink" },
  generatePageNameFromLabel: (label) => label.replace(/ /g, "_"),
  uriSuffix: "",
  postProcessLabel: (label) => `[[${label.trim()}]]`,
});
const mdit = require("markdown-it")().use(wikilinks);

const htmlToHoquet = require("html-to-hoquet");

//NotePlan doesn't insert new line after blockquotes block and they swallow text
//In NotePlan i use only one > per paragraphs (and don't break them into separat quote lines)
//therefore adding new line after each > line generates separate quotation block
//and doesn't swallow content after quotes block
function fixBlockquotesEnd(md) {
  var lines = md.split("\n");
  // var inQuotes = false;
  for (var i = 0; i < lines.length; i++) {
    if (lines[i].trim()[0] == ">") lines[i] += "\n";
    // if (lines[i].trim()[0] == ">") inQuotes = true;
    // else if (inQuotes) {
    //   lines[i] = "\n" + lines[i];
    //   inQuotes = false;
    // }
  }
  return lines.join("\n");
}

function parseMarkdown(md, title) {
  md = fixBlockquotesEnd(md);
  // var parsedHtml = mdit.render(md);
  var parsedHtml = unified()
    .use(markdownParser)
    .use(breaksPlugin)
    .use(wikiLinkPlugin, {
      wikiLinkClassName: "wikilink",
      hrefTemplate: () => '#',
    })
    .use(titlePlugin, { title: title })
    .use(md2html)
    .use(toHtmlStr)
    .processSync(md)
    .toString();
  var content = htmlToHoquet(parsedHtml);
  return content;
}

let contents = [];
let state = {
  notes: [],
  searchString: "",
  selectedNote: {},
};

function visit(node, meta) {
  // console.log(node)
  if (Array.isArray(node)) {
    if (node[0] == "hr") {
      node[1].class += " mt4";
    }
    if (node[0] == "h1") {
      node[1].class += " ma0 mt4";
      node.push(' ')
      node.push(['a', { href: '#', class: 'normal', onclick: (e) => {
        e.preventDefault()
        searchNoteByTitle(node[2])
        return false
      }}, '[...]'])
    }
    if (node[0] == "li") {
      // node[1].class += " no-break";
    }
    if (node[0] == "li") {
      // node[1].class += " no-break";
    }
    if (node[0] == "input" && node[1].type == "checkbox") {
      node[1].class += " mr2";
    }
    if (node[0] == "blockquote") {
      node[1].class += " b--light-gray gray bl bw1 ml0 pl3";
    }
    if (node[0] == "code") {
      node[1].class += ' f6 blue pa1'
    }
    if (node[0] == "ul") {
      meta = {
        ...meta,
        listDepth: (meta.listDepth || 0) + 1,
      };
      node[1].class += " list ma0 pa0 f5";
      // if (meta.listDepth >= 2) node[1].class += ' pl35' //pl35
    }
    if (node[0] == "img") {
      let folder = state.selectedNote.fileName || "";
      let ext = path.extname(folder);
      // folder = folder.replace(new RegExp(ext + "$"), "")
      folder = path.basename(folder, ext);
      folder += "_attachments";

      node[1].src = `iCloud/Documents/Calendar/${folder}/${node[1].src}`;
      node[1].class += " mv3 db";
    }

    // nice item separation but text looks weird, needed on mobile
    if (isMobile && node[0] == "li") {
      node[1].class += " mt2";
    }
    if (node[0] == "a") {
      const color = node[3] == "Edit" ? "red" : "green";
      node[1].class += " no-underline dim " + color;
      if (node[1].class && node[1].class.includes("wikilink")) {
        node[1].onclick = (e) => {
          e.preventDefault();
          var noteTitle = e.srcElement.innerText
            .replace(/^\[\[/, "")
            .replace(/\]\]$/, "");
          searchNoteByTitle(noteTitle);
          // alert(
          // `You have clicked ${e.srcElement.innerText} the future is near!`
          // );
          return false;
        };
      }
    }
    node.forEach((child) => visit(child, meta));
  } else {
  }

  return node;
}

let appWidth = 1000;
let appOpacity = 0;
let appMarginTop = 50;

function searchNoteByTitle(noteTitle) {  
  var note = state.notes.find((note) => note.title == noteTitle);
  console.log('searchNoteByTitle', noteTitle, note)
  if (note) {
    render(note)
  }
  else {
    note = {
      fileName: `Notes/${noteTitle}.txt`,
      title: noteTitle,
      contents: `# {noteTitle}`
    }
    render(note)
  }
  appWidth = 1000;
  opacity = 0;
}

function searchNoteByFileName(fileName) {
  var note = state.notes.find((note) => note.fileName == fileName);
  if (note) render(note);
  appWidth = 1000;
  opacity = 0;
}

function render(note) {
  state.selectedNote = note;
  let md = note.contents;

  const urlParam = note.fileName
    .replace("Calendar/", "noteDate=")
    .replace("Notes/", "noteTitle=")
    .replace(/\.txt$/, "");

  const noteTitle = note.title;
  var references = state.notes.reduce((references, note) => {
    var searchStr = `[[${noteTitle}]]`;
    if (note.contents.includes(searchStr)) {
      var idx = note.contents.indexOf(searchStr);
      var beforeIdx = idx;
      var afterIdx = idx;
      while (beforeIdx > 0 && note.contents[beforeIdx] != "\n") {
        beforeIdx--;
      }
      while (
        afterIdx < note.contents.length - 1 &&
        note.contents[afterIdx] != "\n"
      ) {
        afterIdx++;
      }
      var quote = note.contents.substring(beforeIdx, afterIdx);
      references.push({
        noteTitle: note.title,
        quote: quote,
      });
    }
    return references;
  }, []);
  var unlinkedReferences = state.notes.reduce((references, note) => {
    var searchStr = `${noteTitle}`;
    if (note.contents.includes(searchStr) && note.title != noteTitle) {
      var idx = note.contents.indexOf(searchStr);
      var beforeIdx = idx;
      var afterIdx = idx;
      while (beforeIdx >= 0 && note.contents[beforeIdx] != "\n") {
        beforeIdx--;
      }
      while (
        afterIdx < note.contents.length - 1 &&
        note.contents[afterIdx] != "\n"
      ) {
        afterIdx++;
      }
      // if (note.contents[beforeIdx] == "\n") beforeIdx++;
      var quote = note.contents.substring(beforeIdx, afterIdx);
      references.push({
        noteTitle: note.title,
        quote: quote,
      });
    }
    return references;
  }, []);

  console.log("references", references);
  console.log("unlinkedReferences", unlinkedReferences);

  unlinkedReferences = unlinkedReferences.filter((unlinkedRef) => {
    return !references.find((ref) => ref.noteTitle == unlinkedRef.noteTitle);
  });

  console.log("unlinkedReferences", unlinkedReferences);

  md += `\n\n---\n[Edit](noteplan://x-callback-url/openNote?${urlParam.replace(
    / /g,
    "%20"
  )})\n`;

  const referencesMd = references.map(
    (ref) => `\n[[${ref.noteTitle}]]\n\n >${ref.quote.trim()}`
  );
  const unlinkedReferencesMd = unlinkedReferences.map(
    (ref) => `\n[[${ref.noteTitle}]]()\n\n >${ref.quote.trim()}`
  );
  md += `\n\n\n---\n**REFERENCES**\n${referencesMd.join("\n")}`;
  // if (unlinkedReferences.length > 0) {
  md += `\n\n\n---\n**UNLINKED**\n${unlinkedReferencesMd.join("\n")}`;
  // }

  console.log("md", md.split("\n"));
  const parsedContents = parseMarkdown(md, note.title);
  contents = visit(parsedContents, {});
}

const app = () => {
  var app = document.getElementById("app");
  if (app) {
    if (
      !isMobile &&
      app.clientHeight + appMarginTop * 1.4 > window.innerHeight
    ) {
      appWidth += 500;
      appOpacity = 0;
    } else if (
      !isMobile &&
      app.clientHeight + appMarginTop * 1.4 > window.innerHeight
    ) {
      appWidth += 500;
      appOpacity = 0;
    } else {
      appOpacity = 1;
    }
  }
  const numColumns = isMobile ? 5 : 2;
  // initialization steps
  // ...
  // root component is just a static array
  return [
    "div#app",
    {
      class: "overflow-y-hidden",
      style: {
        width: isMobile ? "100%" : `${appWidth}px`,
        opacity: appOpacity,
      },
    },
    [
      "div#menu",
      {
        class: "db fixed top-0 pt3",
      },
      [
        "a",
        {
          href: "#",
          class: "no-underline green dim",
          onclick: (e) => {
            e.preventDefault();
            searchNoteByTitle("!Root");
            return false;
          },
        },
        "!Root",
      ],
      " ",
      [
        "a",
        {
          href: "#",
          class: "no-underline green dim",
          onclick: (e) => {
            e.preventDefault();
            searchNoteByTitle(
              new Date().toISOString().substr(0, 10).replace(/-/g, "")
            );
            return false;
          },
        },
        "Today",
      ],
      [
        "input",
        {
          type: "text",
          class: "db w5",
          onchange: (e) => {
            state.searchString = e.srcElement.value.toLowerCase();
          },
        },
      ],
      [
        "select",
        {
          class: "db w5",
          onchange: (e) => {
            searchNoteByFileName(e.srcElement.value);
          },
        },
        ["option", {}, " "],
        ...state.notes
          .filter(
            (note) =>
              !state.searchString ||
              note.title.toLowerCase().includes(state.searchString)
          )
          .map((note) => ["option", { value: note.fileName }, note.title]),
      ],
    ],
    [
      "div#contents",
      {
        style: {
          // "column-count": numColumns,
          "margin-top": appMarginTop + "px",
          "column-width": isMobile ? "auto" : "450px",
          "column-gap": "4rem",
          // "text-overflow": "ellipsis",
          // "white-space": "nowrap",
          // overflow: "hidden",
          "overflow-wrap": "break-word",
        },
      },
      ...contents,
    ],
  ];
};

// start RAF update & diff loop
start(app, { root: document.body });

socket.on("connect", () => {
  console.log("connected");
  socket.on("message", (msg) => {
    console.log("msg", msg);
    if (msg.type == "init") {
      state.notes = msg.notes.map((note) => ({
        ...note,
        title: path.basename(note.fileName).replace(/\.txt$/, ""),
      }));
      searchNoteByFileName("Calendar/20200513.txt");
      // searchNoteByTitle("PEX 20010 ECS PBR");
      
      // searchNoteByFileName("Notes/Nick Nikolov.txt");
    }
    if (msg.type == "update") {
      // render(msg)
    }
  });

  setTimeout(() => {
    console.log("sending hi");
    socket.send("hi");
  }, 10 - 0);
});
