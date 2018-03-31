const vscode = require('vscode');
let ssh2_ = require("./src/ssh2promise").SSH2UTILS;
let fs_ = require("fs");
let path_ = require("path");

let { commands, workspace, window, extensions, TextDocument, Uri, StatusBarAlignment, StatusBarItem } = vscode;
let statusBarItem_ = null;

function uploadApp(args) {
    workspace.getConfiguration('jsconfig').get('exclude');
    console.log(args);
}
function restartApp(args) {
    console.log(args);
}

function activate(context) {
    // let disposable = vscode.commands.registerCommand('extension.sayHello', function () {
    //     vscode.window.showInformationMessage('Hello World!');
    //     statusBarItem_.text = 'BBox: Hello World!';
    // });

    // workspace.onDidSaveTextDocument(function (event) {
    //     statusBarItem_.text = "saved!"
    // });

    // if (statusBarItem_ == null)
    //     statusBarItem_ = window.createStatusBarItem(StatusBarAlignment.Left);
    // statusBarItem_.text = "BBox:";
    // statusBarItem_.show();

    context.subscriptions.push(commands.registerCommand('et.uploadApp', uploadApp));
    context.subscriptions.push(commands.registerCommand('et.restartApp', restartApp));

}
exports.activate = activate;
function deactivate() {
}
exports.deactivate = deactivate;