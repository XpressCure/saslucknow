# SAS Lucknow Android App Design Package

This folder is deliberately isolated from the live SAS Lucknow website code.

## Review files

- `SAS-Lucknow-Android-App-Blueprint-v1.docx` - editable product and technical blueprint, including the mobile-safe connection contract.
- The interactive screen board is shown directly in the Codex conversation.

## Scope of the first design pass

The screen board contains 23 connected, responsive screens across:

- public discovery and Pushpanjali;
- account creation and member login;
- member dashboard;
- Darshan's six destinations;
- Sankalp, Yogdaan, Parichay and notifications.

## Recommended next build step

After approval of the hierarchy and visual direction, create the Android project in Kotlin with Jetpack Compose. Start with Splash, Home, Join Community, Login, Member Dashboard and Darshan Hub, using mock data before integrating the existing SAS Lucknow APIs through the mobile-safe authentication adapter.
