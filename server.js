const path = require("path");
const fs = require("fs");
const chokidar = require("chokidar");
const glob = require('glob')

const io = require("socket.io")(3009);
let folder =
  "/Users/vorg/Library/Mobile Documents/iCloud~co~noteplan~NotePlan/Documents/";
// let file = `${folder}/Notes/Variable Covid Strategy Review.txt`;

var clients = [];

var start = Date.now()
var files = glob.sync(`${folder}/**/*.txt`)
var notes = files.map((filePath) => ({
  // filePath: filePath,
  fileName: path.relative(folder, filePath),
  contents: fs.readFileSync(filePath, 'utf8')
}))
var end = Date.now()
console.log(`Loaded ${notes.length} notes in ${end - start}ms`)

// One-liner for current directory
// chokidar.watch(filePath).on("all", (event, filePath) => {
//   const contents = fs.readFileSync(filePath, "utf-8");
//   const updateMsg = {
//     fileName: path.relative(folder, filePath),
//     contents: contents,
//   };

//   clients.forEach((socket) => socket.send(updateMsg));
// });

io.on("connection", (socket) => {
  clients.push(socket);
  socket.on("message", (msg) => {
    if (msg == "hi") {      
      socket.send({
        type: 'init',
        notes: notes
      });
      // const contents = fs.readFileSync(file, "utf-8");
      // socket.send({
      //   type: 'update',
      //   name: path.relative(folder, file),
      //   contents: contents,
      // });
    }
  });
  socket.on("disconnect", () => {
    clients.splice(clients.indexOf(socket), 1);
  });
});
