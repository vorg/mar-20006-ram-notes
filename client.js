const io = require("socket.io-client/dist/socket.io.js");
const host = `${location.hostname}:3009`;
console.log(host);
var socket = io(host);

const { start, renderOnce } = require("@thi.ng/hdom");
const { serialize } = require("@thi.ng/hiccup");

const isMobile = window.innerWidth < 800

const wikilinks = require("@kwvanderlinde/markdown-it-wikilinks")({
  linkPattern: /\[\[([\w\s/!]+)(\|([\w\s/!]+))?\]\]/,
  htmlAttributes: { class: "wikilink" },
  generatePageNameFromLabel: (label) => label.replace(/ /g, "_"),
  uriSuffix: "",
  postProcessLabel: (label) => `[[${label.trim()}]]`
});
const mdit = require("markdown-it")().use(wikilinks);

const htmlToHoquet = require("html-to-hoquet");

function parseMarkdown(md) {
  var parsedHtml = mdit.render(md);
  var content = htmlToHoquet(parsedHtml);
  return content;
}

let contents = [];

function visit(node, meta) {
  // console.log(node)
  if (Array.isArray(node)) {
    if (node[0] == "h1") {
      node[1].class += ' ma0 mt4'
    }
    if (node[0] == "ul") {
      meta = {
        ...meta,
        listDepth: (meta.listDepth || 0) + 1
      }
      node[1].class += " list ma0 pa0 f5";    
      // if (meta.listDepth >= 2) node[1].class += ' pl35' //pl35 
    }
    if (node[0] == "img") {
      node[1].src = `iCloud/Documents/Calendar/20200506_attachments/${node[1].src}`
      node[1].height = '200'
      node[1].class += ' mv3 db'
    }

    // nice item separation but text looks weird, needed on mobile
    if (isMobile && node[0] == "li") {
      node[1].class += " mt2";    
    }
    if (node[0] == "a") {
      node[1].class += " green no-underline dim";
    }
    node.forEach((child) => visit(child, meta));
  } else {
  }

  return node;
}

const app = () => {
  const numColumns = isMobile ? 1 : 3
  // initialization steps
  // ...
  // root component is just a static array
  return ["div#app", { style: { "column-count": numColumns } }, ...contents];
};

// start RAF update & diff loop
start(app, { root: document.body });

socket.on("connect", () => {
  console.log("connected");
  socket.on("message", (msg) => {
    console.log("msg", msg);
    if (msg.contents) {
      let md = msg.contents
      md = '# Today\n' + md
      const parsedContents = parseMarkdown(md);
      // var parsedContents = ['h1', {}, '', 'bla']
      contents = visit(parsedContents, {});
      console.log(contents);
      // contents =
      // console.log(contents[0], parsedContents)

      //contents = parse(src);
      // console.log('contents', contents)
    }
  });

  setTimeout(() => {
    console.log("sending hi");
    socket.send("hi");
  }, 10 - 0);
});
