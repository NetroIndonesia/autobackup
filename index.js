const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const cron = require('node-cron');
const readline = require('readline');
const request = require('request');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const configFile = 'config.json';
let folderToBackup = '';
let backupFolder = './backups';
let webhooks = [];
let cooldownDuration = '*/60 * * * *';

function getRandomWebhook() {
    const randomIndex = Math.floor(Math.random() * webhooks.length);
    return webhooks[randomIndex];
}

function readConfig() {
    try {
        const configData = fs.readFileSync(configFile, 'utf8');
        const config = JSON.parse(configData);

        folderToBackup = config.folderToBackup || '';
        backupFolder = config.backupFolder || './backups';
        webhooks = config.webhooks || [];
        cooldownDuration = config.cooldownDuration || '*/60 * * * *';

        createBackupScheduler();
    } catch (err) {
        console.error('Error reading config file:', err);
        getUserInput();
    }
}

function getUserInput() {
    rl.question('Enter the folder path to backup: ', (answer) => {
        folderToBackup = answer;
        rl.question('Enter backup folder path (press Enter for default "./backups"): ', (answer) => {
            if (answer.trim() !== '') {
                backupFolder = answer.trim();
            }
            rl.question('Enter webhook URLs (separate multiple URLs with commas): ', (answer) => {
                webhooks = answer.split(',').map(url => url.trim());
                rl.question('Enter cooldown duration (default "*/60 * * * *"): ', (answer) => {
                    if (answer.trim() !== '') {
                        cooldownDuration = answer.trim();
                    }
                    createBackupScheduler();
                    rl.close();
                });
            });
        });
    });
}

function createBackupScheduler() {
    cron.schedule(cooldownDuration, () => {
        createBackup();
    });
    createBackup(); // Run backup immediately
}

function sendBackupToFileIO(backupFilePath, webhookURL) {
    const backupFile = fs.createReadStream(backupFilePath);

    const formData = {
        file: backupFile
    };

    request.post({ url: 'https://file.io/?expires=1w', formData: formData }, (error, response, body) => {
        if (!error && response.statusCode === 200) {
            const responseBody = JSON.parse(body);
            console.log('Backup successfully uploaded to File.io');
            console.log('File URL:', responseBody.link);

            sendFileIOLinkToWebhook(responseBody.link, webhookURL); 
        } else {
            console.error('An error occurred while uploading the backup to File.io:', error);
        }
    });
}

function sendFileIOLinkToWebhook(fileIOLink, webhookURL) {
    const userId = '<@1025369998438453298>';

    const message = `autobackup by ${userId}\n(${fileIOLink})`; 

    request.post({
        url: webhookURL,
        json: true,
        body: { content: message }
    }, (error, response, body) => {
        if (error) {
            console.error('Error sending File.io link to webhook:', error);
        } else {
            console.log('Response from webhook:', body);
        }
    });
}

let isBackupInProgress = false;

function createBackup() {
    if (isBackupInProgress) {
        console.log('Backup is already in progress.');
        return;
    }

    isBackupInProgress = true;

    const currentDate = new Date();
    const backupFileName = `backup.7z`;
    const backupFilePath = path.join(backupFolder, backupFileName);
    const cmd = `7z a ${backupFilePath} ${folderToBackup} -mx=9`;

    const backupProcess = exec(cmd, (error, stdout, stderr) => {
        isBackupInProgress = false;

        if (error) {
            if (error.code === 'ENOENT') {
                console.error('File or folder not found. Backup process failed.');
            } else {
                console.error('Error during backup creation:', error);
            }
            return;
        }

        console.log('Backup created successfully.');

        const stats = fs.statSync(backupFilePath);
        const fileSizeInBytes = stats.size;
        const fileSizeInMB = fileSizeInBytes / (1024 * 1024);

        if (fileSizeInMB >= 23) {
            const randomWebhook = getRandomWebhook();
            sendBackupToFileIO(backupFilePath, randomWebhook); 
        } else {
            const randomWebhook = getRandomWebhook();
            sendBackupToWebhookAfterSizeCheck(backupFilePath, randomWebhook); 
        }
    });

    // Timeout to kill the process if it runs too long
    const backupTimeout = 1200 * 1200 * 1000; // 1 hour
    setTimeout(() => {
        if (isBackupInProgress) {
            backupProcess.kill();
            isBackupInProgress = false;
            console.error('Backup process took too long. Terminated.');
        }
    }, backupTimeout);
}

function sendBackupToWebhookAfterSizeCheck(backupFilePath, webhookURL) {
    const fileStats = fs.statSync(backupFilePath);
    const fileSizeInBytes = fileStats.size;
    const fileSizeInMB = fileSizeInBytes / (1024 * 1024);

    if (fileSizeInMB > 25) {
        console.log('File size exceeds 25MB. Skipping webhook upload.');
        return;
    }

    const backupFile = fs.createReadStream(backupFilePath);

    const formData = {
        file: {
            value: backupFile,
            options: {
                filename: `backup.7z`,
                contentType: 'application/x-7z-compressed',
                knownLength: fileSizeInBytes
            }
        }
    };

    const options = {
        url: webhookURL,
        formData: formData
    };

    request.post(options, (error, response, body) => {
        if (!error && response.statusCode === 200) {
            console.log(`Backup successfully sent to webhook: ${webhookURL}`);
            console.log(`Backup file name: backup.7z`);
            console.log(`Backup file size: ${fileSizeInMB} MB`);
        } else {
            console.error('An error occurred while sending the backup to the webhook:', error);
        }
    });
}

readConfig();
