"use strict";

const PREFIX = '[BBox]';
const DEBUG_MODE = require('fs').existsSync(`${__dirname}/DEBUG_SIGN_FILE`);

/** @type {Logger} */
let Log = null;
//@ts-ignore
Log = (...fields) => console.log(PREFIX, ...fields);
Log.debugMode = DEBUG_MODE;

if (DEBUG_MODE) {
	// Debug Mode
	['log', 'warn', 'error'].forEach(a => { let b = console[a]; console[a] = (...c) => { try { throw new Error } catch (d) { b.apply(console, [PREFIX, d.stack.split('\n')[2].trim().substring(3).replace(__dirname, '').replace(/\s\(./, ' at ').replace(/\)/, ''), "", ...c]) } } });
} else {
	// Release Mode
	console.log = console.warn = console.error = function () { };;
}

module.exports = Log;