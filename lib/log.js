
function info (what) {
    console.log(` - ${what}`);
}

const fatal = (error) => {
    console.error(error);
    process.exit(1);
}

const finished = (what) => {
    console.log(what);
    console.log(` - finished @ ${new Date()}`);
    process.exit(0);
};

const stdoutWrite = (what) => {
    what = what + '';
    while (what.length < process.stdout.columns) {
        what = `${what} `;
    }
    process.stdout.write(`\r${what}`);
}

module.exports = {
    info, fatal, finished, stdoutWrite
};

