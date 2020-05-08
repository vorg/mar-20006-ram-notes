"use strict";

var htmlparser = require('htmlparser2');

function htmlToHoquet(str) {
    var root = [];
    var stack = [root];
    var parser = new htmlparser.Parser({
        onopentag: function(name, attribs){
            //hoquet won't close tag if there is no content
            //so we need empty string inside the tag
            var node = [name, attribs, ''];
            stack[stack.length-1].push(node);
            stack.push(node);
        },
        ontext: function(text){
            if (text.trim()) {
                stack[stack.length-1].push(text);
            }
        },
        onclosetag: function(name){
            stack.pop()
        }
    }, {decodeEntities: true});
    parser.write(str);
    parser.end();
    if (root.length == 1) {
        return root[0];
    }
    return root;
}

module.exports = htmlToHoquet;
