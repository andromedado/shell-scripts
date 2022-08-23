
const fs = require('fs');
const { fatal } = require('./log');

const STYLES = {
    DEPLOYABLE: {
        name : 'deployable',
        command: 'mvn clean -U package -DskipTests',
        commandHeader: 'Clean and package'
    },
    BUILDABLE: {
        name: 'buildable',
        command: 'mvn clean install deploy -DskipTests',
        commandHeader: 'Install and deploy'
    }
};

function determineStyle(pomPath, args) {
    const pomContents = fs.readFileSync(pomPath, {encoding: 'utf-8'});

    if (/maven-war-plugin/.test(pomContents)) {
        return STYLES.DEPLOYABLE;
    } else if (/maven-jar-plugin/.test(pomContents) || /protobuf-maven-plugin/.test(pomContents) || /maven-surefire-plugin/.test(pomContents)) {
        if (!(/SNAPSHOT<\/version/.test(pomContents))) {
            if (!args.includes('--force')) {
                fatal('Declining to build a non-SNAPSHOT jar (consider --force)');
            }
        }
        return STYLES.BUILDABLE;
    } else {
        fatal('Project type unrecognized - not war/jar?');
    }
}

module.exports = {
    STYLES,
    determineStyle
};

