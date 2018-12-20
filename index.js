/**
 * @file electron.js
 * @author Ken Eucker <keneucker@gmail.com>
 */
const electron = require('electron'),
	fs = require('fs'),
	yargs = require('yargs'),
	path = require('path'),
	proc = require('child_process'),
	offspring = proc.spawn,
	quasarSDK = require('@digitaltrends/quasar'),
	quasarCLI = require('@digitaltrends/quasar-cli'),
	app = electron.app,
	BrowserWindow = electron.BrowserWindow;

/**
 * @classdesc Runs the QuasarWebApp in an electron window
 * @class QuasarElectronApp
 * @hideconstructor
 * @export
 */
class QuasarElectronApp {
	constructor() {
		if ((!yargs.argv.noLogo || yargs.argv.noLogo == false)) {
			try {
				const packageJson = require(path.resolve(`${quasarSDK.config.applicationRoot}/package.json`));
				quasarSDK.logQuasarLogo('QuasarElectron', packageJson, 'cyan');
			} catch (e) {

			}
		}

		this.mainWindow = null;
		this.PORT = process.env.PORT || '3000';
		const runningProcess = process.title.split('/').pop().toLowerCase();
		const runningInElectron = runningProcess.indexOf('electron') !== -1;
		const runOnInit = yargs.argv.runElectron;

		if (runningInElectron) {
			this.run();
		} else if (runOnInit) {
			const runElectronArgs = ['.', `--port=${this.PORT}`];
			if (yargs.argv.log) {
				runElectronArgs.push(`--log=${yargs.argv.log}`);
			}
			offspring(electron, runElectronArgs, {
				stdio: 'inherit',
			});
		}
	}

	/**
	 * @description creates an electron window
	 * @param {string} [title='quasar']
	 * @param {string} [htmlContent=null]
	 * @returns {BrowserWindow}
	 * @memberof QuasarElectronApp
	 */
	createWindow(title = 'quasar', htmlContent = null) {
		// Create the browser window
		const iconPath = this.getIconFilePath();
		const browserWindowOptions = {
			width: 1200,
			height: 800,
			icon: iconPath,
			show: true,
		};

		this.mainWindow = new BrowserWindow(browserWindowOptions);
		this.mainWindow.setTitle(title);

		if (!htmlContent) {
			this.mainWindow.loadURL(`http://localhost:${this.PORT}`);
		} else {
			this.mainWindow.loadURL("data:text/html;charset=utf-8," + encodeURI(htmlContent));
		}
		// mainWindow.webContents.openDevTools();

		this.mainWindow.on('closed', function () {
			this.mainWindow = null
		}.bind(this))

		this.mainWindow.show();

		return this.mainWindow;
	}

	/**
	 * @description runs the quasar cli to watch the jobs folder, then creates the app window
	 * @returns {BrowserWindow}
	 * @memberof QuasarElectronApp
	 */
	electrify() {
		try {
			// quasar.setLogLevel(yargs.argv.log);
			// return this.showErrorWindow('ATTEMPTING RUN');
			quasarCLI.run({
					appRoot: this.appRoot,
					watchJobs: true,
					runWebForm: true,
					autoBuildWebForm: true,
					noPrompt: true,
					runWebApi: true,
				})
				.then(function () {
					return this.createWindow('quasar');
				}.bind(this))
				.catch(function (e) {
					return this.showErrorWindow(e);
				}.bind(this));
		} catch (e) {
			return this.showErrorWindow(e);
		}
	}

	/**
	 * @description returns the path to the icon file
	 * @param {string} [rootPath=appRoot]
	 * @param {string} [iconName='icon']
	 * @param {string} [iconExt='.ico']
	 * @returns {BrowserWindow}
	 * @memberof QuasarElectronApp
	 */
	getIconFilePath(rootPath, iconName = 'icon', iconExt = '.ico') {
		rootPath = rootPath || path.resolve(`${this.appRoot}/app/webform`);
		const iconPath = path.resolve(`${rootPath}/${iconName}${iconExt}`);

		if (fs.existsSync(iconPath)) {
			return iconPath;
		}

		const iconExtensionsInOrder = ['ico', 'icns', 'png', 'jpg'],
			nextIconExtension = iconExtensionsInOrder.indexOf(iconExt);
		if (nextIconExtension >= 0) {
			return this.getIconFilePath(rootPath, iconName = 'icon', nextIconExtension);
		} else {
			return false;
		}
	}

	/**
	 * @description Creates an electron app and sets it up to run quasar
	 * @memberof QuasarElectronApp
	 */
	run() {
		this.appRoot = app.getAppPath();
		// this.appRoot = electronUtil.fixPathForAsarUnpack(this.appRoot);

		app.on('ready', this.electrify.bind(this));

		app.on('window-all-closed', () => {
			if (process.platform !== 'darwin') {
				app.quit();
			}
		});

		app.on('activate', function () {
			if (this.mainWindow === null) {
				this.createWindow();
			} else {
				this.showErrorWindow(new Error('mainWindow is null, sorry.'));
			}
		}.bind(this));
	}

	/**
	 * @description creates a window with the content of an error for debugging purposes
	 * @param {*} error
	 * @returns {BrowserWindow}
	 * @memberof QuasarElectronApp
	 */
	showErrorWindow(error) {
		let title, errorContent;
		try {
			title = `${this.appRoot} failure: ${error}`;
			errorContent = `
				<div>
					<h1>Error</h1>
					<h4>Application RootPath:</h4><span>${this.appRoot}</span>
					<h4>Error Message:</h4><span>${error}</span>
					<h4>Error Stacktrace:</h4><pre>${JSON.stringify(error, null, 2)}</pre>
				</div>`;
		} catch (e) {
			title = "Ruh Roh Raggy!";
			errorContent = `<div>
					<h1>Error</h1>
					<h4>Application RootPath:</h4><span>${this.appRoot}</span>
					<h4>Error Message:</h4><span>A Terrible thing has just occured</span>
					<h4>Error Stacktrace:</h4><pre>0</pre>
				</div>`;
		}

		return this.createWindow(title, errorContent);
	}
}

module.exports = new QuasarElectronApp();
