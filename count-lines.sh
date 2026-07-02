#!/bin/bash

# Code line counter script for CannonWar project
# Usage: ./count-lines.sh

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Excluded directories
EXCLUDE_DIRS="-not -path '*/node_modules/*' -not -path '*/dist/*' -not -path '*/.git/*'"

# Function to count lines in a directory (returns only the number)
get_line_count() {
    local dir="$1"
    local pattern="$2"
    local maxdepth="$3"

    if [ ! -d "$PROJECT_ROOT/$dir" ]; then
        echo "0"
        return
    fi

    local depth_opt=""
    if [ -n "$maxdepth" ]; then
        depth_opt="-maxdepth $maxdepth"
    fi

    local count=$(eval "find '$PROJECT_ROOT/$dir' $depth_opt -type f -name '$pattern' ! -name '*.d.ts' $EXCLUDE_DIRS 2>/dev/null" | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}')
    echo "${count:-0}"
}

# Function to count files
get_file_count() {
    local dir="$1"
    local maxdepth="$2"

    if [ ! -d "$PROJECT_ROOT/$dir" ]; then
        echo "0"
        return
    fi

    local depth_opt=""
    if [ -n "$maxdepth" ]; then
        depth_opt="-maxdepth $maxdepth"
    fi

    eval "find '$PROJECT_ROOT/$dir' $depth_opt -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' -o -name '*.less' -o -name '*.css' -o -name '*.html' \) ! -name '*.d.ts' $EXCLUDE_DIRS 2>/dev/null" | wc -l
}

# Function to display directory stats
show_dir_stats() {
    local dir="$1"
    local label="$2"
    local maxdepth="$3"

    if [ ! -d "$PROJECT_ROOT/$dir" ]; then
        echo -e "${YELLOW}Directory $dir does not exist${NC}"
        return
    fi

    local ts_count=$(get_line_count "$dir" "*.ts" "$maxdepth")
    local tsx_count=$(get_line_count "$dir" "*.tsx" "$maxdepth")
    local js_count=$(get_line_count "$dir" "*.js" "$maxdepth")
    local less_count=$(get_line_count "$dir" "*.less" "$maxdepth")
    local css_count=$(get_line_count "$dir" "*.css" "$maxdepth")
    local html_count=$(get_line_count "$dir" "*.html" "$maxdepth")

    local ts_total=$((ts_count + tsx_count))
    local total=$((ts_total + js_count + less_count + css_count + html_count))

    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}📁 $label${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    printf "  %-20s %'10d lines\n" "TypeScript:" "$ts_total"
    printf "  %-20s %'10d lines\n" "JavaScript:" "$js_count"
    printf "  %-20s %'10d lines\n" "HTML:" "$html_count"
    printf "  %-20s %'10d lines\n" "LESS:" "$less_count"
    printf "  %-20s %'10d lines\n" "CSS:" "$css_count"
    echo -e "  ${CYAN}─────────────────────────────────────${NC}"
    printf "  ${YELLOW}%-20s %'10d lines${NC}\n" "Subtotal:" "$total"
    echo ""
}

# Calculate total for a directory
calc_total() {
    local dir="$1"
    local maxdepth="$2"

    local ts=$(($(get_line_count "$dir" "*.ts" "$maxdepth") + $(get_line_count "$dir" "*.tsx" "$maxdepth")))
    local js=$(get_line_count "$dir" "*.js" "$maxdepth")
    local less=$(get_line_count "$dir" "*.less" "$maxdepth")
    local css=$(get_line_count "$dir" "*.css" "$maxdepth")
    local html=$(get_line_count "$dir" "*.html" "$maxdepth")
    echo $((ts + js + less + css + html))
}

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     CannonWar Code Line Counter            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo -e "${CYAN}  (excludes node_modules, dist directories)${NC}"
echo ""

# Show stats for each directory
show_dir_stats "." "Root Files" "1"
show_dir_stats "src" "Source Code (src/)"
show_dir_stats "server" "Server Code (server/)"
show_dir_stats "shared" "Shared Code (shared/)"

# Calculate totals
root_total=$(calc_total "." "1")
src_total=$(calc_total "src")
server_total=$(calc_total "server")
shared_total=$(calc_total "shared")

grand_total=$((root_total + src_total + server_total + shared_total))

# Count files
root_files=$(get_file_count "." "1")
src_files=$(get_file_count "src")
server_files=$(get_file_count "server")
shared_files=$(get_file_count "shared")
total_files=$((root_files + src_files + server_files + shared_files))

echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              SUMMARY                       ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo ""
printf "  %-15s %'10d lines  (%d files)\n" "root/" "$root_total" "$root_files"
printf "  %-15s %'10d lines  (%d files)\n" "src/" "$src_total" "$src_files"
printf "  %-15s %'10d lines  (%d files)\n" "server/" "$server_total" "$server_files"
printf "  %-15s %'10d lines  (%d files)\n" "shared/" "$shared_total" "$shared_files"
echo -e "  ${CYAN}─────────────────────────────────────────${NC}"
printf "  ${YELLOW}%-15s %'10d lines  (%d files)${NC}\n" "TOTAL:" "$grand_total" "$total_files"
echo ""
