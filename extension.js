const vscode = require('vscode');
let fs_ = require("fs");
let path_ = require("path");
let ext_ = require('./src/VSCodeHelper');
let statusBar_ = require('./src/StatusBarManager');
let ssh2_ = require("./src/ssh2promise").SSH2UTILS;

let { commands, workspace, window, extensions, TextDocument, Uri, StatusBarAlignment, StatusBarItem } = vscode;
let statusBarItem_ = null;

function uploadApp(args) {
    console.log(args);
}
function restartApp(args) {
    console.log(args);
}

/** when extension launch or vscode config change */
function updateConfigurations() {
    //CodingTracker Configuration
    let configurations = ext_.getConfig('codingTracker'),
        uploadToken = String(configurations.get('uploadToken')),
        uploadURL = String(configurations.get('serverURL')),
        computerId = String(configurations.get('computerId')),
        mtt = parseInt(configurations.get('moreThinkingTime')),
        enableStatusBar = configurations.get('showStatus');

    let config2 = ext_.getConfig('et'),
        host = String(config2.get('sshHost')),
        port = parseInt(config2.get('sshPort'));




    // fixed wrong more thinking time configuration value
    // if (isNaN(mtt)) mtt = 0;
    // if (mtt < -15 * SECOND) mtt = -15 * SECOND;
    // moreThinkingTime = mtt;

    // uploadURL = (uploadURL.endsWith('/') ? uploadURL : (uploadURL + '/')) + 'ajax/upload';
    // uploader.set(uploadURL, uploadToken);
    // uploadObject.init(computerId || `unknown-${require('os').platform()}`);

    // localServer.updateConfig();
    statusBar_.init(enableStatusBar);
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

    //Declare for add disposable inside easy
    let subscriptions = context.subscriptions;

    //Update configurations first time
    updateConfigurations();
    /*
        //Listening workspace configurations change    
        vscode.workspace.onDidChangeConfiguration(updateConfigurations);
    
        //Tracking the file display when vscode open
        EventHandler.onActiveFileChange((vscode.window.activeTextEditor || EMPTY).document);
    
        //Listening vscode event to record coding activity
        subscriptions.push(vscode.workspace.onDidChangeTextDocument(e => EventHandler.onFileCoding((e || EMPTY).document)));
        subscriptions.push(vscode.window.onDidChangeActiveTextEditor(e => EventHandler.onActiveFileChange((e || EMPTY).document)));
        //the below event happen means you change the cursor in the document.
        //So It means you are watching so intently in some ways
        subscriptions.push(vscode.window.onDidChangeTextEditorSelection(e => EventHandler.onIntentlyWatchingCodes((e || EMPTY).textEditor)));
    
        // Maybe I will add "onDidChangeVisibleTextEditors" in extension in next version
        // For detect more detailed editor information
        // But this event will always include debug-input box if you open debug panel one time
    
        // subscriptions.push(vscode.window.onDidChangeVisibleTextEditors(e => console.log('onDidChangeVisibleTextEditors', e)))
    
        // debug command
        // subscriptions.push(vscode.commands.registerCommand('codingTracker.dumpVCSQueue', () => {
        //     console.log(require('./lib/vcs/Git')._getVCSInfoQueue);
        // }));
     */
    context.subscriptions.push(commands.registerCommand('et.uploadApp', uploadApp));
    context.subscriptions.push(commands.registerCommand('et.restartApp', restartApp));

}

function deactivate() {
}

exports.deactivate = deactivate;
exports.activate = activate;