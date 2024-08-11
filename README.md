
# Automated Backup System

## Overview

This Node.js application automates folder backups and handles large files by uploading them to File.io or sending smaller files directly to a webhook. Configuration is flexible via JSON or user input, and backups are scheduled using cron jobs.

## Features

- **Automated Backups:** Compresses and backs up a specified folder.
- **File Size Management:** Uploads large backups to File.io or sends smaller ones directly to a webhook.
- **Configurable:** Set up through `config.json` or user prompts.
- **Scheduled:** Uses cron jobs for regular backups.

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/NetroIndonesia/autobackup.git
   ```

2. Navigate to the project directory:
   ```
   cd automated-backup-system
   ```

3. Install dependencies:
   ```
   npm install
   ```

## Configuration

Configure via `config.json` or user input. The `config.json` format:
```json
{
    "folderToBackup": "path/to/folder",
    "backupFolder": "./backups",
    "webhooks": [
        "https://your-webhook-url1",
        "https://your-webhook-url2"
    ],
    "cooldownDuration": "*/60 * * * *"
}
```

## Usage

1. Start the application:
   ```
   node index.js
   ```

2. Follow the prompts or ensure `config.json` is set up correctly.

3. Monitor the application output for status and errors.

## Cron Jobs

Backups are scheduled using the `node-cron` library based on the `cooldownDuration` parameter, defaulting to every hour.

## Error Handling

Errors during backup or file handling are logged. Large files are uploaded to File.io if direct webhook upload is not possible.

## License

Licensed under the MIT License. See [LICENSE](LICENSE) for details.

## Contributing

Contributions are welcome! Fork the repository and submit a pull request.

## Contact

For questions, open an issue on the [Telegram Channel](https://t.me/htfgtps).
