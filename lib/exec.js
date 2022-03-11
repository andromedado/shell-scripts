
const childProcess = require('child_process');
const fs = require('fs');

const { info, fatal, stdoutWrite } = require('./log');

const warEnding = /\.war$/;

function stopTomcat(catalinaHome) {
    let tomcatRunning = false;
    try {
        childProcess.execSync(`ps ax | grep 'tomca[t]'`);
        tomcatRunning = true;
    } catch (e) {
        // no tomcat running
        info('Tomcat is not running');
    }
    if (tomcatRunning) {
        info('Stopping tomcat');
        childProcess.execSync(`${catalinaHome}/bin/shutdown.sh`);
        childProcess.execSync(`ps -eaf | grep 'tomca[t]' | awk '{print "kill -9 " $2}' | sh`);
    }
}

const logDirFragment = '/data/logs/tomcat';

function removeLogs() {
    // guess log dir first 😅
    let logDir = false;
    if (fs.existsSync(logDirFragment)) {
        logDir = logDirFragment;
    } else if (process.env.HOME && fs.existsSync(`${process.env.HOME}${logDirFragment}`)) {
        logDir = `${process.env.HOME}${logDirFragment}`;
    } else {
        // try something else?
    }

    if (logDir) {
        fs.readdirSync(logDir)
            .filter(f => !(/\.\./.test(f)))
            .forEach(f => {
                info(`Removing ${f}`);
                fs.unlinkSync(`${logDir}/${f}`)
            });
    }
}

function removeAllExistingDeployments(webappsDir) {
    const files = fs.readdirSync(webappsDir).filter(f => !(/\.\./.test(f)));

    filesMap = {};
    files.forEach(f => filesMap[f] = true)
    
    const filesToDelete = [];
    const dirsToDelete = [];
    files.forEach(file => {
        if (warEnding.test(file)) {
            filesToDelete.push(file);
            const dir = file.replace(warEnding, '');
            if (filesMap[dir]) {
                dirsToDelete.push(dir);
            }
        }
    });

    filesToDelete.forEach(f => {
        info(`Removing ${f}`);
        fs.unlinkSync(`${webappsDir}/${f}`)
    });
    dirsToDelete.forEach(dir => {
        info(`Removing ${dir}`);
        fs.rmdirSync(`${webappsDir}/${dir}`, {recursive: true});
    });    
}

let warCache = null;
function getBuiltWars(targetDir) {
    if (!warCache) {
        warCache = fs.readdirSync(targetDir).filter(f => warEnding.test(f));
    }
    return warCache;
}

function build(command, successCallback) {
    successCallback = successCallback || (() => {});
    warCache = null;
    const buildProcess = childProcess.exec(command, (err, stdout, stderr) => {
        if (err) {
            fatal(err);
        }
        if (stderr) {
            console.error('stderr');
            console.error(stderr);
        }
    });
    
    const buildBuffer = [];
    buildProcess.stdout.on('data', (datum) => {
        datum
            .replace(/\r/, '\n')
            .split('\n')
            .map(d => d.trim().substr(0, process.stdout.columns).trim())
            .filter(d => !!d)
            .forEach(output => {
                if (/ Building/.test(output)) {
                    stdoutWrite(output + '\n');
                }
                buildBuffer.push(output);
                while (buildBuffer.length > 25) {
                    buildBuffer.shift();
                }
                stdoutWrite(output);
            });
    });
    
    buildProcess.on('exit', (code, signal) => {
        if (code + '' !== '0') {
            console.log('');
            console.log(buildBuffer.join('\n'));
            fatal('Unable to build');
        }
        stdoutWrite(' Build Success');
        console.log('');
        successCallback();
    });
}

function deploy(webappsDir, targetDir) {
    const wars = getBuiltWars(targetDir);
    if (!wars.length) {
        fatal(`No war found in ${targetDir}`);
    }
    wars.forEach(war => {
        const deployable = war.split('.war')[0];
        const warPath = `${webappsDir}/${war}`;

        if (fs.existsSync(warPath)) {
            info('Removing existing deployed war');
            fs.unlinkSync(`${webappsDir}/${war}`)
        }
        const expandedWarPath = `${webappsDir}/${deployable}`;
        if (fs.existsSync(expandedWarPath)) {
            info('Removing existing expanded deployed war');
            fs.rmdirSync(expandedWarPath, {recursive: true});
        }

        info(`Deploying ${war}`);
        fs.copyFileSync(`${targetDir}/${war}`, warPath);
    });

    return wars;
}

function startTomcat(startupFile, targetDir, callback) {
    info(`Starting Tomcat`);
    childProcess.execSync(startupFile);
    
    const wars = getBuiltWars(targetDir);
    const serviceWar = wars.filter(war => /-[0-9]\.war$/.test(war))[0];

    if (serviceWar) {
        const warName = serviceWar.split('.war')[0];
        setTimeout(() => {
            childProcess.execSync(`open 'http://127.0.0.1:8080/${warName}/1/health.json'`);
            callback();
        }, 1000);
    } else {
        callback();
    }
}

function fsMustExist(path, result) {
    const exists = fs.existsSync(path);
    if (!exists) {
        fatal(result);
    }
}

module.exports = {
    fsMustExist,
    stopTomcat, removeLogs,
    removeAllExistingDeployments,
    build, deploy, startTomcat
};
