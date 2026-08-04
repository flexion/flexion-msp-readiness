#!/bin/bash
# Move GitHub issue between project columns
# Usage: ./scripts/move-issue.sh <issue-number> <status>
# Status options: backlog, ready, in-progress, in-review, done

set -e

ISSUE_NUM=$1
STATUS=$2
OWNER="flexion"
PROJECT_NUM=53

if [ -z "$ISSUE_NUM" ] || [ -z "$STATUS" ]; then
  echo "Usage: $0 <issue-number> <status>"
  echo ""
  echo "Status options:"
  echo "  backlog"
  echo "  ready"
  echo "  in-progress"
  echo "  in-review"
  echo "  done"
  exit 1
fi

# Project and Status field IDs
PROJECT_ID="PVT_kwDOACbWn84BfSXa"
STATUS_FIELD_ID="PVTSSF_lADOACbWn84BfSXazhZmTtU"

# Status option IDs - map status names to IDs
case "$STATUS" in
  backlog)
    STATUS_ID="f75ad846"
    ;;
  ready)
    STATUS_ID="61e4505c"
    ;;
  in-progress)
    STATUS_ID="47fc9ee4"
    ;;
  in-review)
    STATUS_ID="df73e18b"
    ;;
  done)
    STATUS_ID="98236657"
    ;;
  *)
    STATUS_ID=""
    ;;
esac

if [ -z "$STATUS_ID" ]; then
  echo "Error: Invalid status '$STATUS'"
  echo "Valid options: backlog, ready, in-progress, in-review, done"
  exit 1
fi

# Get the project item ID for this issue
echo "Finding issue #$ISSUE_NUM in project..."
ITEM_DATA=$(gh project item-list $PROJECT_NUM --owner $OWNER --format json --limit 100 | \
  jq -r ".items[] | select(.content.number == $ISSUE_NUM) | {itemId: .id, currentStatus: .status}")

if [ -z "$ITEM_DATA" ] || [ "$ITEM_DATA" == "null" ]; then
  echo "Error: Issue #$ISSUE_NUM not found in project"
  exit 1
fi

ITEM_ID=$(echo "$ITEM_DATA" | jq -r '.itemId')
CURRENT_STATUS=$(echo "$ITEM_DATA" | jq -r '.currentStatus')

echo "Current status: $CURRENT_STATUS"
echo "Moving to: $STATUS"

# Move the item
gh project item-edit \
  --project-id "$PROJECT_ID" \
  --id "$ITEM_ID" \
  --field-id "$STATUS_FIELD_ID" \
  --single-select-option-id "$STATUS_ID"

echo "✅ Issue #$ISSUE_NUM moved to '$STATUS'"
