"use strict";

const vscode = require('vscode');
let fs_ = require("fs");
let path_ = require("path");
let log_ = require('./Log');
let ext_ = require('./src/VSCodeHelper');
let statusBar_ = require('./src/StatusBarManager');
let ssh2_ = require("./src/ssh2promise").SSH2UTILS;

let { commands, workspace, window, extensions, TextDocument, Uri, StatusBarAlignment, StatusBarItem } = vscode;
let statusBarItem_ = null;

/** more thinking time from user configuration */
let moreThinkingTime_ = 0;
/** current active document*/
let activeDocument_ = null;
/** Tracking data, record document open time, first coding time and last coding time and coding time long */
let trackData_ = {
    openTime: 0,
    lastIntentlyTime: 0,
    firstCodingTime: 0,
    codingLong: 0,
    lastCodingTime: 0
};
let resetTrackOpenAndIntentlyTime = (now) => { trackData_.openTime = trackData_.lastIntentlyTime = now };
/** How many ms in 1s */
const SECOND = 1000;

/** shortest time to record coding. 5000 means: All coding record divide by 5000  */
const CODING_SHORTEST_UNIT_MS = 5 * SECOND;

/** at least time to upload a watching(open) record */
const AT_LEAST_WATCHING_TIME = 5 * SECOND;

/**
 * means if you are not intently watching time is more than this number
 * the watching track will not be continuously but a new record
 */
const MAX_ALLOW_NOT_INTENTLY_MS = 60 * SECOND;

/** if you have time below not coding(pressing your keyboard), the coding track record will be upload and re-track */
const MAX_CODING_WAIT_TIME = 30 * SECOND;

/** If there a event onFileCoding with scheme in here, just ignore this event */
const INVALID_CODING_DOCUMENT_SCHEMES = [
    //there are will be a `onDidChangeTextDocument` with document scheme `git-index`
    //be emitted when you switch document, so ignore it
    'git-index',
    //since 1.9.0 vscode changed `git-index` to `git`, OK, they are refactoring around source control
    //see more: https://code.visualstudio.com/updates/v1_9#_contributable-scm-providers
    'git',
    //when you just look up output channel content, there will be a `onDidChangeTextDocument` be emitted
    'output',
    //This is a edit event emit from you debug console input box
    'input',
    //This scheme is appeared in vscode global replace diff preview editor
    'private',
    //This scheme is used for markdown preview document
    //It will appear when you edit a markdown with aside preview
    'markdown'
];

const EMPTY = { document: null, textEditor: null };

/** Handler VSCode Event */
let EventHandler = {
    /** @param {vscode.TextEditor} doc */
    // onIntentlyWatchingCodes: (textEditor) => {
    //     // if (log_.debugMode)
    //     //     log_.d('watching intently: ' + ext.dumpEditor(textEditor));
    //     if (!textEditor || !textEditor.document)
    //         return;//Empty document
    //     let now = Date.now();
    //     //Long time have not intently watching document
    //     if (now > trackData.lastIntentlyTime + MAX_ALLOW_NOT_INTENTLY_MS + moreThinkingTime) {
    //         uploadOpenTrackData(now);
    //         //uploadOpenTrackDate has same expression as below:
    //         //resetTrackOpenAndIntentlyTime(now);
    //     } else {
    //         trackData.lastIntentlyTime = now;
    //     }
    // },
    /** @param {vscode.TextDocument} doc */
    onActiveFileChange: (doc) => {
        // if(log_.debugMode)
        //     log_.d('active file change: ' + ext.dumpDocument(doc));
        let now = Date.now();
        // If there is a TextEditor opened before changed, should upload the track data
        if (activeDocument_) {
            //At least open 5 seconds
            if (trackData_.openTime < now - AT_LEAST_WATCHING_TIME) {
                //uploadOpenTrackData(now);
            }
            //At least coding 1 second
            if (trackData_.codingLong) {
                //uploadCodingTrackData();
            }
        }
        activeDocument_ = ext_.cloneTextDocument(doc);
        //Retracking file open time again (Prevent has not retracked open time when upload open tracking data has been called)
        resetTrackOpenAndIntentlyTime(now);
        trackData_.codingLong = trackData_.lastCodingTime = trackData_.firstCodingTime = 0;
    },
    /** @param {vscode.TextDocument} doc */
    onFileCoding: (doc) => {
        if (!activeDocument_)
            return;

        // Ignore the invalid coding file schemes
        if (!doc || INVALID_CODING_DOCUMENT_SCHEMES.indexOf(doc.uri.scheme) >= 0)
            return;

        if (log_.debugMode) {
            // fragment in this if condition is for catching unknown document scheme
            let { uri } = doc, { scheme } = uri;
            if (scheme != 'file' &&
                scheme != 'untitled' &&
                scheme != 'debug' &&
                //scheme in vscode user settings (or quick search bar in user settings)
                // vscode://defaultsettings/{0...N}/settings.json
                scheme != 'vscode' &&
                //scheme in vscode ineractive playground
                scheme != 'walkThroughSnippet') {
                window.showInformationMessage(`Unknown uri scheme(details in console): ${scheme}: ${uri.toString()}`);
                console.log(ext.dumpDocument(doc));
            }
        }

        let now = Date.now();
        //If time is too short to calling this function then just ignore it 
        if (now - CODING_SHORTEST_UNIT_MS < trackData_.lastCodingTime)
            return;
        // Update document line count
        activeDocument_.lineCount = doc.lineCount;

        //If is first time coding in this file, record time
        if (!trackData_.firstCodingTime)
            trackData_.firstCodingTime = now;
        //If too long time to recoding, so upload old coding track and retracking
        else if (trackData_.lastCodingTime < now - MAX_CODING_WAIT_TIME - moreThinkingTime_) {//30s
            //uploadCodingTrackData()
            //Reset first coding time
            trackData_.firstCodingTime = now;
        }
        trackData_.codingLong += CODING_SHORTEST_UNIT_MS;
        trackData_.lastCodingTime = now;
    }
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
function uploadApp(args) {
    console.log(args.fsPath);
}
function restartApp(args) {
    console.log(args.fsPath);
}
function activate(context) {
    //Declare for add disposable inside easy
    let subscriptions = context.subscriptions;

    //Update configurations first time
    updateConfigurations();

    //Listening workspace configurations change    
    subscriptions.push(workspace.onDidChangeConfiguration(updateConfigurations));

    //Tracking the file display when vscode open
    EventHandler.onActiveFileChange((vscode.window.activeTextEditor || EMPTY).document);

    //Listening vscode event to record coding activity
    subscriptions.push(workspace.onDidChangeTextDocument(e => EventHandler.onFileCoding((e || EMPTY).document)));
    subscriptions.push(window.onDidChangeActiveTextEditor(e => EventHandler.onActiveFileChange((e || EMPTY).document)));
    //subscriptions.push(window.onDidChangeTextEditorSelection(e => EventHandler.onIntentlyWatchingCodes((e || EMPTY).textEditor)));
    /*
        // Maybe I will add "onDidChangeVisibleTextEditors" in extension in next version
        // For detect more detailed editor information
        // But this event will always include debug-input box if you open debug panel one time
    
        // subscriptions.push(vscode.window.onDidChangeVisibleTextEditors(e => log_.d('onDidChangeVisibleTextEditors', e)))
    
        // debug command
        // subscriptions.push(vscode.commands.registerCommand('codingTracker.dumpVCSQueue', () => {
        //     log_.d(require('./lib/vcs/Git')._getVCSInfoQueue);
        // }));
     */
    subscriptions.push(commands.registerCommand('et.uploadApp', uploadApp));
    subscriptions.push(commands.registerCommand('et.restartApp', restartApp));

}

function deactivate() {
}

exports.deactivate = deactivate;
exports.activate = activate;