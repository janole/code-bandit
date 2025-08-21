# Code Bandit VS Code Extension Changelog

<!--
All notable changes to the Code Bandit VS Code extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
-->

## [0.3.6] - 2024

### Added
- Added MIT license file to the extension directory
- Added VS Code entry point configuration

### Changed
- Updated dependencies to latest versions
- Improved package.json metadata with author, repository, homepage, and bugs information
- Enhanced build configuration with proper TypeScript compilation
- Updated README with extension status, usage, and contribution guidelines

## [0.3.5] - 2024

### Added
- Initial VS Code extension for Code Bandit
- AI-powered commit message generation for Git repositories
- Configuration options for showing commit progress UI in extension settings
- Configurable progress location for commit message creation
- Auto-fill commit message command with keyboard shortcut support (Ctrl/Cmd + Alt + C)

### Added Configurations
- `codeBandit.aI.models.gitCommit`: controls AI provider/model for commit messages (default: openai/gpt-4.1-mini)
- `codeBandit.uI.showCommitButton`: show/hide commit button in Source Control (default: true)
- `codeBandit.uI.showCommitProgress`: controls where progress is displayed (notification/status bar/silent)

### Fixed
- Removed metafile option to silence esbuild log output
- Corrected sourcemap option in build configuration
- Removed unused imports and commented code from build config

### Documentation
- Added comprehensive README with extension usage information
- Improved formatting and clarity in documentation
- Added roadmap and contribution guidelines

### Technical
- Set up proper TypeScript compilation with tsc and esbuild
- Added linting configuration with ESLint and automatic fixes
- Configured vscode extension engine requirements (>= 1.102.0)
- Established npm publishing workflow with prepublish script

## [0.3.4] and earlier

### Initial Features
- Basic structure for VS Code extension targeting commit message generation
- Package.json configuration with proper extension metadata
- Build system setup with esbuild and TypeScript