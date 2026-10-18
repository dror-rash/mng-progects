#!/usr/bin/env bash
set -euo pipefail

# ANSI color codes
BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Default values
DEFAULT_PROJECT_NAME="my-waypoint-app"
DEFAULT_DESCRIPTION="A full-stack multi-zone web app built from Waypoint"
PROJECT_NAME=""
TARGET_DIR=""
PROJECT_DESC=""
DO_INSTALL=""
DO_GIT=""
NON_INTERACTIVE=false

print_help() {
  cat << EOF
Usage: $(basename "$0") [OPTIONS]

Scaffold a new production-ready project from the Waypoint multi-zone template.

Options:
  -n, --name <name>        Project name (used in package.json)
  -d, --dest <path>        Destination directory path
  --description <text>     Project description
  --skip-install           Do not run 'pnpm install' after scaffolding
  --skip-git               Do not initialize a new git repository
  -y, --non-interactive    Run non-interactively, using defaults for unspecified options
  -h, --help               Show this help message
EOF
}

# Parse command line flags
while [[ $# -gt 0 ]]; do
  case "$1" in
    -n|--name)
      PROJECT_NAME="$2"
      shift 2
      ;;
    -d|--dest)
      TARGET_DIR="$2"
      shift 2
      ;;
    --description)
      PROJECT_DESC="$2"
      shift 2
      ;;
    --skip-install)
      DO_INSTALL=false
      shift
      ;;
    --skip-git)
      DO_GIT=false
      shift
      ;;
    -y|--non-interactive)
      NON_INTERACTIVE=true
      shift
      ;;
    -h|--help)
      print_help
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      print_help
      exit 1
      ;;
  esac
done

echo -e "${CYAN}${BOLD}"
echo "=================================================="
echo "          Waypoint Project Scaffolder             "
echo "=================================================="
echo -e "${NC}"

# Interactive prompts if running in terminal and non-interactive is false
if [ "$NON_INTERACTIVE" = false ] && [ -t 0 ]; then
  # 1. Project name
  if [ -z "$PROJECT_NAME" ]; then
    read -r -p "$(echo -e "${BOLD}Project name${NC} [${DEFAULT_PROJECT_NAME}]: ")" INPUT_NAME
    PROJECT_NAME="${INPUT_NAME:-$DEFAULT_PROJECT_NAME}"
  fi

  # 2. Destination directory
  if [ -z "$TARGET_DIR" ]; then
    DEFAULT_DIR="./$PROJECT_NAME"
    read -r -p "$(echo -e "${BOLD}Destination directory${NC} [${DEFAULT_DIR}]: ")" INPUT_DIR
    TARGET_DIR="${INPUT_DIR:-$DEFAULT_DIR}"
  fi

  # 3. Description
  if [ -z "$PROJECT_DESC" ]; then
    read -r -p "$(echo -e "${BOLD}Project description${NC} [${DEFAULT_DESCRIPTION}]: ")" INPUT_DESC
    PROJECT_DESC="${INPUT_DESC:-$DEFAULT_DESCRIPTION}"
  fi

  # 4. Git init
  if [ -z "$DO_GIT" ]; then
    read -r -p "$(echo -e "${BOLD}Initialize a new git repository?${NC} (Y/n): ")" INPUT_GIT
    case "${INPUT_GIT:-Y}" in
      [yY]|[yY][eE][sS]) DO_GIT=true ;;
      *) DO_GIT=false ;;
    esac
  fi

  # 5. pnpm install
  if [ -z "$DO_INSTALL" ]; then
    read -r -p "$(echo -e "${BOLD}Install dependencies now with pnpm?${NC} (Y/n): ")" INPUT_INSTALL
    case "${INPUT_INSTALL:-Y}" in
      [yY]|[yY][eE][sS]) DO_INSTALL=true ;;
      *) DO_INSTALL=false ;;
    esac
  fi
else
  # Non-interactive defaults
  if [ -z "$PROJECT_NAME" ]; then
    if [ -n "$TARGET_DIR" ]; then
      PROJECT_NAME="$(basename "$TARGET_DIR")"
    else
      PROJECT_NAME="$DEFAULT_PROJECT_NAME"
    fi
  fi
  if [ -z "$TARGET_DIR" ]; then
    TARGET_DIR="./$PROJECT_NAME"
  fi
  if [ -z "$PROJECT_DESC" ]; then
    PROJECT_DESC="$DEFAULT_DESCRIPTION"
  fi
  if [ -z "$DO_GIT" ]; then
    DO_GIT=true
  fi
  if [ -z "$DO_INSTALL" ]; then
    DO_INSTALL=true
  fi
fi

# Resolve absolute destination directory
mkdir -p "$TARGET_DIR"
TARGET_DIR="$(cd "$TARGET_DIR" && pwd)"

echo -e "\n${BLUE}Scaffolding project into:${NC} ${BOLD}$TARGET_DIR${NC}"
echo -e "${BLUE}Project name:${NC}             ${BOLD}$PROJECT_NAME${NC}"

# Check destination directory
if [ -n "$(ls -A "$TARGET_DIR" 2>/dev/null)" ]; then
  echo -e "${YELLOW}Warning: Destination directory is not empty.${NC}"
fi

# Copy template files excluding build artifacts and version control
echo -e "\n${BLUE}Copying template files...${NC}"
if command -v rsync >/dev/null 2>&1; then
  rsync -a \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='.next' \
    --exclude='.turbo' \
    --exclude='dist' \
    --exclude='.env' \
    --exclude='*.log' \
    --exclude='test-results' \
    --exclude='storybook-static' \
    --exclude='*.tsbuildinfo' \
    --exclude='.features-gen' \
    --exclude='scripts/test-scaffold.sh' \
    "$TEMPLATE_DIR/" "$TARGET_DIR/"
else
  # Fallback using tar
  tar -C "$TEMPLATE_DIR" \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='.next' \
    --exclude='.turbo' \
    --exclude='dist' \
    --exclude='.env' \
    --exclude='*.log' \
    --exclude='test-results' \
    --exclude='storybook-static' \
    --exclude='*.tsbuildinfo' \
    --exclude='.features-gen' \
    --exclude='scripts/test-scaffold.sh' \
    -cf - . | tar -C "$TARGET_DIR" -xf -
fi

# Customize package.json name
if [ -f "$TARGET_DIR/package.json" ]; then
  node -e "
    const fs = require('fs');
    const file = '$TARGET_DIR/package.json';
    const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
    pkg.name = '$PROJECT_NAME';
    pkg.description = '$PROJECT_DESC';
    fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n');
  "
fi

# Setup .env with freshly generated random secret
echo -e "${BLUE}Configuring environment and generating security tokens...${NC}"
if [ -f "$TARGET_DIR/.env.example" ]; then
  # Generate 32 bytes base64 secret
  if command -v openssl >/dev/null 2>&1; then
    NEW_SECRET=$(openssl rand -base64 32)
  else
    NEW_SECRET=$(node -e 'console.log(require("crypto").randomBytes(32).toString("base64"))')
  fi

  # Write .env with replaced secret
  sed -e "s|^BETTER_AUTH_SECRET=.*|BETTER_AUTH_SECRET=$NEW_SECRET|" "$TARGET_DIR/.env.example" > "$TARGET_DIR/.env"
fi

# Initialize git repository if requested
if [ "$DO_GIT" = true ]; then
  echo -e "${BLUE}Initializing fresh git repository...${NC}"
  (
    cd "$TARGET_DIR"
    git init -b main >/dev/null 2>&1 || git init >/dev/null 2>&1
    git add . >/dev/null 2>&1
    git commit -m "chore: initial scaffold from Waypoint template" >/dev/null 2>&1 || true
  )
fi

# Install dependencies if requested
if [ "$DO_INSTALL" = true ]; then
  echo -e "${BLUE}Installing dependencies with pnpm (this may take a moment)...${NC}"
  (
    cd "$TARGET_DIR"
    if command -v pnpm >/dev/null 2>&1; then
      pnpm install
    else
      echo -e "${YELLOW}pnpm not found. Please run 'npm install -g pnpm && pnpm install' manually.${NC}"
    fi
  )
fi

echo -e "\n${GREEN}${BOLD}✓ Project successfully scaffolded!${NC}\n"
echo -e "Next steps to run your new application:"
echo -e "  1. ${CYAN}cd $TARGET_DIR${NC}"
echo -e "  2. ${CYAN}pnpm db:up${NC}         # Start local PostgreSQL in Docker"
echo -e "  3. ${CYAN}pnpm db:migrate${NC}    # Apply database migrations"
echo -e "  4. ${CYAN}pnpm dev${NC}           # Start all zones (shell :3000, example :3001, dashboard :3002)"
echo -e "  5. ${CYAN}pnpm test${NC}          # Run test suites (Vitest & Playwright)"
echo ""
