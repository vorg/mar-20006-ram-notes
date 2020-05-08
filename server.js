const path = require("path");
const fs = require("fs");
const chokidar = require("chokidar");

const io = require("socket.io")(3009);
let folder =
  "/Users/vorg/Library/Mobile Documents/iCloud~co~noteplan~NotePlan/Documents/";
// let file = `${folder}/Notes/Variable Covid Strategy Review.txt`;
let file = `${folder}/Calendar/20200506.txt`;

var clients = [];

// One-liner for current directory
chokidar.watch(file).on("all", (event, filePath) => {
  const contents = fs.readFileSync(file, "utf-8");
  const updateMsg = {
    name: path.relative(folder, file),
    contents: contents,
  };

  clients.forEach((socket) => socket.send(updateMsg));
});

io.on("connection", (socket) => {
  clients.push(socket);
  socket.on("message", (msg) => {
    if (msg == "hi") {
      const contents = fs.readFileSync(file, "utf-8");
      socket.send({
        name: path.relative(folder, file),
        contents: contents,
      });
    }
    //socket.send('yo!')
  });
  socket.on("disconnect", () => {
    clients.splice(clients.indexOf(socket), 1);
  });
});
