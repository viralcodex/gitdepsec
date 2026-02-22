# GitDepSec CLI

A powerful CLI tool for analyzing dependency vulnerabilities in your projects. Supports npm, PyPI, Maven, RubyGems, Composer, and Pub.

[![npm version](https://img.shields.io/npm/v/@avrl/gitdepsec.svg)](https://www.npmjs.com/package/@avrl/gitdepsec)
[![npm provenance](https://img.shields.io/badge/npm-provenance-brightgreen)](https://docs.npmjs.com/generating-provenance-statements)

## Installation

```bash
# Using npm
npm install -g @avrl/gitdepsec

# Using bun
bun add -g @avrl/gitdepsec

# Or run without installing
npx @avrl/gitdepsec audit
bunx @avrl/gitdepsec audit
```

## Usage

### Analyze Local Project

```bash
# Analyze package.json in current directory
gds audit

# Analyze specific file
gds audit -f package.json
gds audit -f requirements.txt
gds audit -f pom.xml

# Analyze multiple files
gds audit -f package.json -f requirements.txt
```

### Analyze GitHub Repository

```bash
# Public repository
gds audit --repo owner/repo

# Specific branch
gds audit --repo owner/repo --branch develop

# With GitHub token (for private repos or higher rate limits)
gds audit --repo owner/repo --token ghp_xxxxx
```

### Output Formats

```bash
# Default: colored table output
gds audit

# JSON output (for piping/scripting)
gds audit --format json

# Markdown output
gds audit --format markdown

# Save to file
gds audit --output report.json --format json
```

### Include Transitive Dependencies

```bash
# Transitive scanning is enabled by default
gds audit

# Disable transitive (direct dependencies only)
gds audit --no-transitive
```

### Generate Fix Plan

```bash
# Generate fix recommendations
gds fix

# Fix specific file
gds fix -f package.json

# Direct dependencies only
gds fix --no-transitive

# Output as JSON
gds fix --format json
```

## Configuration

Create a `.gitdepsecrc` or `.gitdepsec.json` in your project root:

```json
{
  "github_token": "ghp_xxxxx",
  "include_transitive": true,
  "output_format": "table"
}
```

Or use environment variables:

```bash
export GITHUB_TOKEN=ghp_xxxxx
export GDS_INCLUDE_TRANSITIVE=true
export GDS_OUTPUT_FORMAT=table
```

## Commands

| Command         | Description                              |
| --------------- | ---------------------------------------- |
| `gds audit`   | Analyze dependencies for vulnerabilities |
| `gds fix`       | Generate fix recommendations             |
| `gds init`      | Create configuration file                |
| `gds --version` | Show version                             |
| `gds --help`    | Show help                                |

## CLI Options Reference

### `gds audit`

| Option                  | Description                                |
| ----------------------- | ------------------------------------------ |
| `-f, --file <files...>` | Manifest file(s) to analyze                |
| `-r, --repo <repo>`     | GitHub repository in `owner/repo` format   |
| `-b, --branch <branch>` | Branch to analyze                          |
| `-t, --token <token>`   | GitHub personal access token               |
| `--no-transitive`       | Disable transitive dependency scanning     |
| `--format <format>`     | Output format: `table`, `json`, `markdown` |
| `-o, --output <file>`   | Save output to file                        |
| `-q, --quiet`           | Minimal output                             |
| `-v, --verbose`         | Verbose output                             |

### `gds fix`

| Option                  | Description                                |
| ----------------------- | ------------------------------------------ |
| `-f, --file <files...>` | Manifest file(s) to generate fixes for     |
| `-r, --repo <repo>`     | GitHub repository in `owner/repo` format   |
| `-b, --branch <branch>` | Branch to analyze                          |
| `-t, --token <token>`   | GitHub personal access token               |
| `--no-transitive`       | Disable transitive dependency scanning     |
| `--format <format>`     | Output format: `table`, `json`, `markdown` |
| `-o, --output <file>`   | Save output to file                        |

## Supported Ecosystems

- **npm** - `package.json`
- **PyPI** - `requirements.txt`
- **Maven** - `pom.xml`
- **RubyGems** - `Gemfile`
- **Composer** - `composer.json`
- **Pub** - `pubspec.yaml`

## Exit Codes

For `gds audit`:

| Code | Description                       |
| ---- | --------------------------------- |
| 0    | Success, no vulnerabilities found |
| 1    | Vulnerabilities found             |
| 2    | Error during audit             |

For `gds fix`:

- `0`: Fix plan generated
- `2`: Error during fix plan generation

## AI Harness Usage (Terminal)

Use the CLI directly from your AI harness/tool and consume structured JSON output.

```bash
# Analyze local manifests as JSON
gds audit --format json

# Analyze a specific repo and save JSON output
gds audit --repo owner/repo --format json --output report.json

# Generate fix plan as JSON
gds fix --format json
```

## License

MIT
