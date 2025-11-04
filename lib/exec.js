
const childProcess = require('child_process');
const fs = require('fs');

const { info, fatal, stdoutWrite, echo } = require('./log');

const warEnding = /\.war$/;

const shellExec = (command, silent) => {
    if (!silent) {
        echo(command);
    }
    childProcess.execSync(command);
}

function isRunning(processRegExp) {
    try {
        shellExec(`ps ax | grep '${processRegExp}'`, true);
        return true;
    } catch (e) {
        return false;
    }
}

function ensureOff(what, processRegExp, shutdownCommand) {
    if (isRunning(processRegExp)) {
        info(`Stopping ${what}`);
        if (shutdownCommand) {
            shellExec(shutdownCommand);
        }
        shellExec(`ps -eaf | grep '${processRegExp}' | awk '{print "kill -9 " $2}' | sh`);
    } else {
        info(`${what} is not running`);
    }
}

function ensureRunning(what, processRegExp, startupCommand) {
    if (!isRunning(processRegExp)) {
        info(`Starting ${what}`);
        shellExec(startupCommand);
    } else {
        info(`${what} is already running`);
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
        fs.rmSync(`${webappsDir}/${dir}`, {recursive: true});
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
    echo(command);
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
            fs.rmSync(expandedWarPath, {recursive: true});
        }

        info(`Deploying ${war}`);
        fs.copyFileSync(`${targetDir}/${war}`, warPath);
    });

    return wars;
}

function startTomcat(startupFile, targetDir, callback) {

    ensureRunning('Memcached', 'memcache[d]', '$(which memcached) -d');
    ensureRunning('ActiveMQ', 'activem[q]', '$(which activemq) start');

    info(`Starting Tomcat`);
    shellExec(startupFile);
    
    const wars = getBuiltWars(targetDir);
    const serviceWar = wars.filter(war => /-[0-9]\.war$/.test(war))[0];

    if (serviceWar) {
        const warName = serviceWar.split('.war')[0];
        setTimeout(() => {
            shellExec(`open 'http://127.0.0.1:8080/${warName}/1/health.json'`);
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

// Java target check
function checkJavaTarget(pomContents) {
    // Extract maven.compiler.release or maven.compiler.target from pom.xml
    // Look for properties section or plugin configuration
    let targetVersion = null;
    
    // Check for maven.compiler.release in properties
    const releaseMatch = pomContents.match(/<maven\.compiler\.release>\s*(\d+)\s*<\/maven\.compiler\.release>/);
    if (releaseMatch) {
        targetVersion = parseInt(releaseMatch[1], 10);
    }
    
    // Check for maven.compiler.target in properties (if release not found)
    if (!targetVersion) {
        const targetMatch = pomContents.match(/<maven\.compiler\.target>\s*(\d+)\s*<\/maven\.compiler\.target>/);
        if (targetMatch) {
            targetVersion = parseInt(targetMatch[1], 10);
        }
    }

    // If no target specified, skip check
    if (!targetVersion) {
        info('Skipping Java version check: No target version specified in pom.xml');
        return;
    }
    
    // Get Java version from JAVA_HOME
    const javaHome = process.env.JAVA_HOME;
    if (!javaHome) {
        fatal('JAVA_HOME is not set');
    }
    
    // Check if java executable exists
    const javaExecutable = `${javaHome}/bin/java`;
    if (!fs.existsSync(javaExecutable)) {
        fatal(`Java executable not found at ${javaExecutable}`);
    }
    
    // Get Java version
    let javaVersionOutput;
    try {
        javaVersionOutput = childProcess.execSync(`"${javaExecutable}" -version 2>&1`, { encoding: 'utf-8' });
    } catch (error) {
        fatal(`Failed to get Java version: ${error.message}`);
    }
    
    // Parse Java version (format: "openjdk version "1.8.0_xxx" or "java version "1.8.0_xxx" or "openjdk version "17"")
    const versionMatch = javaVersionOutput.match(/version "(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
    if (!versionMatch) {
        fatal(`Could not parse Java version from output: ${javaVersionOutput}`);
    }
    
    // For Java 9+, the first number is the major version
    // For Java 8 and below, it's 1.x where x is the version
    let javaMajorVersion;
    if (parseInt(versionMatch[1], 10) === 1 && versionMatch[2]) {
        // Java 8 or below: version "1.8" -> major version 8
        javaMajorVersion = parseInt(versionMatch[2], 10);
    } else {
        // Java 9+: version "17" -> major version 17
        javaMajorVersion = parseInt(versionMatch[1], 10);
    }
    
    // Compare versions
    if (javaMajorVersion < targetVersion) {
        fatal(`Java version mismatch: JAVA_HOME contains Java ${javaMajorVersion}, but pom.xml requires Java ${targetVersion} (maven.compiler.release or maven.compiler.target)`);
    }
    
    // Warn if Java version is higher (but allow it since newer Java can compile older target)
    if (javaMajorVersion > targetVersion) {
        info(`Warning: Java ${javaMajorVersion} is available, but pom.xml targets Java ${targetVersion}`);
    } else {
        info(`Java version check passed: Java ${javaMajorVersion} matches target ${targetVersion}`);
    }
}

module.exports = {
    fsMustExist,
    ensureOff, ensureRunning,
    removeLogs,
    removeAllExistingDeployments,
    build, deploy, startTomcat, checkJavaTarget
};
