# Security Policy

## Reporting a vulnerability

Please do not open a public issue for a vulnerability that exposes secrets, local files, or a way to operate the user's Mac without consent.

Until a dedicated private security contact is published, send a minimal report to the repository maintainers through GitHub and include:

- affected version or commit
- reproduction steps
- expected and actual behavior
- whether provider keys, local app data, screen contents, microphone input, or Computer Use permissions are involved

Do not include real API keys, private screenshots, or personal data in the report.

## Local secrets

OpenArgos stores provider keys locally and encrypts them with a per-install secret in the app user data directory. The project should not add remote key storage or account-gated access without a clear design review.

## Permissions

Screen Recording, Microphone, Automation, Accessibility, and launch-at-login behavior should remain opt-in through macOS and app settings. Changes that broaden permission use should document why the permission is needed and how a user can turn it off.
